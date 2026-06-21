import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db } from '../db/client.js';
import {
  realEstateCache,
  type CommunePriceSeries,
  type LuPriceData,
} from '../db/schema.js';

/**
 * Luxembourg residential asking-price series, per commune, parsed from the
 * Observatoire de l'Habitat "prix annoncés" retrospective workbooks published
 * on data.public.lu (CC0). One Excel file each for apartments and houses, one
 * sheet per year, €/m² per commune. The expensive fetch+parse is cached in
 * Postgres (mirrors the POI/Overpass cache).
 *
 * Note: these are ADVERTISED prices (asked by sellers before negotiation), not
 * notarial sale prices. For single-family houses no transaction-price product
 * exists, so advertised prices are the only option — surfaced as such in the UI.
 */

const DATASET_API =
  'https://data.public.lu/api/1/datasets/prix-annonces-des-logements-par-commune/';
const SOURCE = "Observatoire de l'Habitat – prix annoncés (data.public.lu, CC0)";
const USER_AGENT = 'HexMapExplorer/1.0 (real-estate trends)';
const CACHE_KEY = 'lu-annonces';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 30_000;

interface DataResource {
  title?: string;
  format?: string;
  url?: string;
  latest?: string;
}

/** Parse a price cell: number, "1234.5"/"1234,5" string, or "*" (suppressed). */
function toNum(v: unknown): number | null {
  if (v == null) return null;
  let x: unknown = v;
  if (typeof x === 'object' && x !== null && 'result' in (x as Record<string, unknown>)) {
    x = (x as Record<string, unknown>).result;
  }
  const n = typeof x === 'number' ? x : parseFloat(String(x).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Pick the retrospective workbook URL for 'appartement' or 'maison'. */
function pickResource(resources: DataResource[], kind: string): string | null {
  for (const r of resources) {
    const t = (r.title ?? '').toLowerCase();
    // "Série rétrospective des prix annoncés des appartements/maisons ..."
    if (t.includes('trospective') && t.includes(kind)) {
      return r.latest ?? r.url ?? null;
    }
  }
  return null;
}

async function fetchJson(url: string): Promise<{ resources?: DataResource[] }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`data.public.lu responded ${res.status}`);
  return (await res.json()) as { resources?: DataResource[] };
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`resource download responded ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** commune name -> (year -> €/m²) for one workbook. */
async function parseWorkbook(buf: Buffer): Promise<Map<string, Map<number, number | null>>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const out = new Map<string, Map<number, number | null>>();
  wb.eachSheet((ws) => {
    const year = parseInt(ws.name, 10);
    if (!Number.isFinite(year)) return; // skip non-year sheets (notes, etc.)
    // Header is a few rows down; locate the row whose column C reads "Commune".
    let headerRow = 0;
    for (let r = 1; r <= 30; r++) {
      if (String(ws.getRow(r).getCell(3).value ?? '').trim() === 'Commune') {
        headerRow = r;
        break;
      }
    }
    if (!headerRow) return;
    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const nameCell = ws.getRow(r).getCell(3).value;
      if (nameCell == null) continue;
      const name = String(nameCell).trim();
      if (!name) continue;
      const perM2 = toNum(ws.getRow(r).getCell(6).value); // col F = avg €/m²
      let m = out.get(name);
      if (!m) {
        m = new Map();
        out.set(name, m);
      }
      m.set(year, perM2);
    }
  });
  return out;
}

async function fetchLuPrices(): Promise<LuPriceData> {
  const ds = await fetchJson(DATASET_API);
  const resources = ds.resources ?? [];
  const aptUrl = pickResource(resources, 'appartement');
  const houseUrl = pickResource(resources, 'maison');
  if (!aptUrl || !houseUrl) {
    throw new Error('retrospective apartment/house resources not found');
  }

  const [aptBuf, houseBuf] = await Promise.all([
    fetchBuffer(aptUrl),
    fetchBuffer(houseUrl),
  ]);
  const apt = await parseWorkbook(aptBuf);
  const house = await parseWorkbook(houseBuf);

  const yearSet = new Set<number>();
  for (const m of apt.values()) for (const y of m.keys()) yearSet.add(y);
  for (const m of house.values()) for (const y of m.keys()) yearSet.add(y);
  const years = [...yearSet].sort((a, b) => a - b);

  const names = new Set<string>([...apt.keys(), ...house.keys()]);
  const communes: CommunePriceSeries[] = [...names]
    .map((name) => ({
      name,
      apartment: years.map((y) => apt.get(name)?.get(y) ?? null),
      house: years.map((y) => house.get(name)?.get(y) ?? null),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { years, communes, source: SOURCE, fetchedAt: new Date().toISOString() };
}

interface PricesQuery {
  force?: string;
}

export async function priceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/prices/lu', async (request, reply) => {
    const q = request.query as PricesQuery;
    const force = q.force === 'true' || q.force === '1';

    const [row] = await db
      .select()
      .from(realEstateCache)
      .where(eq(realEstateCache.cacheKey, CACHE_KEY))
      .limit(1);

    if (!force && row && Date.now() - row.updatedAt.getTime() < CACHE_TTL_MS) {
      return { ...row.data, cached: true };
    }

    let data: LuPriceData;
    try {
      data = await fetchLuPrices();
    } catch (err) {
      request.log.error(err);
      // Serve stale data rather than failing outright, if we have any.
      if (row) return { ...row.data, cached: true };
      return reply.status(502).send({ error: 'Failed to fetch Luxembourg price data' });
    }

    await db
      .insert(realEstateCache)
      .values({ cacheKey: CACHE_KEY, data })
      .onConflictDoUpdate({
        target: realEstateCache.cacheKey,
        set: { data, updatedAt: sql`now()` },
      });

    return { ...data, cached: false };
  });
}
