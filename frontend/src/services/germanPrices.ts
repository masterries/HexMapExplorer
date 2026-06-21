import { approxDistMeters } from './poi';

/**
 * Hobby-grade German-border price seed. A handful of towns on the German side
 * of the Luxembourg border with INDICATIVE average apartment prices (€/m²),
 * so hexes outside Luxembourg still get a rough value in Price mode.
 *
 * These are approximate public-knowledge ballpark figures — NOT official data.
 * The real source (Bodenrichtwerte / destatis) can replace `perM2` later; the
 * lookup mechanism stays the same.
 */
export interface DeTown {
  name: string;
  lat: number;
  lon: number;
  /** Indicative average apartment €/m² (rough, not official). */
  perM2: number;
}

export const DE_BORDER_TOWNS: DeTown[] = [
  { name: 'Trier', lat: 49.7596, lon: 6.6439, perM2: 3700 },
  { name: 'Konz', lat: 49.7008, lon: 6.5772, perM2: 3400 },
  { name: 'Saarburg', lat: 49.6086, lon: 6.5497, perM2: 2900 },
  { name: 'Wittlich', lat: 49.9858, lon: 6.8911, perM2: 2600 },
  { name: 'Bitburg', lat: 49.9747, lon: 6.5253, perM2: 2500 },
  { name: 'Bernkastel-Kues', lat: 49.9133, lon: 7.07, perM2: 2900 },
  { name: 'Perl', lat: 49.4711, lon: 6.3697, perM2: 3300 },
  { name: 'Merzig', lat: 49.4439, lon: 6.6386, perM2: 2500 },
  { name: 'Mettlach', lat: 49.4953, lon: 6.5969, perM2: 2400 },
  { name: 'Saarlouis', lat: 49.3134, lon: 6.7519, perM2: 2500 },
  { name: 'Dillingen', lat: 49.3567, lon: 6.7289, perM2: 2300 },
  { name: 'Saarbrücken', lat: 49.2402, lon: 6.9969, perM2: 2900 },
  { name: 'Wadgassen', lat: 49.2706, lon: 6.7872, perM2: 2200 },
];

/** Nearest German border town within `maxKm`, or null if none is close. */
export function nearestDeTown(lat: number, lon: number, maxKm = 18): DeTown | null {
  let best: DeTown | null = null;
  let bestD = maxKm * 1000;
  for (const t of DE_BORDER_TOWNS) {
    const d = approxDistMeters(lat, lon, t.lat, t.lon);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}
