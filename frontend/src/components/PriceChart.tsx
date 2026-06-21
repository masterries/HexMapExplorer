import { useRef, useState, type MouseEvent } from 'react';

interface PriceChartProps {
  years: number[];
  apartment: (number | null)[];
  house: (number | null)[];
}

const VIEW_W = 320;
const VIEW_H = 188;
const M = { top: 22, right: 12, bottom: 22, left: 40 };

/**
 * Detailed €/m² price-trend chart (apartment + house) for the hex detail view.
 * Pure inline SVG, no chart dependency. Hovering shows a crosshair and the
 * exact values for that year. A richer companion to the compact popup sparkline.
 */
export function PriceChart({ years, apartment, house }: PriceChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = years.length;
  const plotW = VIEW_W - M.left - M.right;
  const plotH = VIEW_H - M.top - M.bottom;

  let min = Infinity;
  let max = -Infinity;
  for (const arr of [apartment, house])
    for (const v of arr)
      if (v != null) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 1;
  }
  const pad = (max - min) * 0.1 || max * 0.1 || 1;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  const ySpan = yMax - yMin || 1;

  const X = (i: number) => M.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const Y = (v: number) => M.top + (1 - (v - yMin) / ySpan) * plotH;

  const linePath = (arr: (number | null)[]) => {
    let d = '';
    let started = false;
    arr.forEach((v, i) => {
      if (v == null) {
        started = false;
        return;
      }
      d += `${started ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)} `;
      started = true;
    });
    return d.trim();
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * ySpan);
  const step = Math.max(1, Math.round(n / 6));
  const xTickIdx = years.map((_, i) => i).filter((i) => i % step === 0 || i === n - 1);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    let i = Math.round(((vbX - M.left) / plotW) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    setHover(i);
  };

  const fmt = (v: number | null) => (v == null ? '–' : Math.round(v).toLocaleString('de-DE'));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      role="img"
      aria-label="Price trend chart"
      style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {yTicks.map((v, k) => (
        <g key={k}>
          <line x1={M.left} y1={Y(v)} x2={VIEW_W - M.right} y2={Y(v)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={M.left - 4} y={Y(v) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
            {(Math.round(v / 100) / 10).toFixed(1)}k
          </text>
        </g>
      ))}
      {xTickIdx.map((i) => (
        <text key={i} x={X(i)} y={VIEW_H - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">
          {years[i]}
        </text>
      ))}

      <path d={linePath(apartment)} fill="none" stroke="#2563eb" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <path d={linePath(house)} fill="none" stroke="#ea580c" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />

      {hover != null && (
        <g>
          <line x1={X(hover)} y1={M.top} x2={X(hover)} y2={M.top + plotH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
          {apartment[hover] != null && <circle cx={X(hover)} cy={Y(apartment[hover] as number)} r={3} fill="#2563eb" />}
          {house[hover] != null && <circle cx={X(hover)} cy={Y(house[hover] as number)} r={3} fill="#ea580c" />}
        </g>
      )}

      <g>
        <rect x={M.left} y={6} width={9} height={3} rx={1} fill="#2563eb" />
        <text x={M.left + 13} y={10} fontSize={8} fill="#6b7280">Wohnung</text>
        <rect x={M.left + 62} y={6} width={9} height={3} rx={1} fill="#ea580c" />
        <text x={M.left + 75} y={10} fontSize={8} fill="#6b7280">Haus</text>
      </g>

      {hover != null && (
        <text x={VIEW_W - M.right} y={10} textAnchor="end" fontSize={8} fill="#374151">
          {years[hover]}: {fmt(apartment[hover])} / {fmt(house[hover])} €/m²
        </text>
      )}
    </svg>
  );
}
