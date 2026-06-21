import { PriceChart } from './PriceChart';
import { POI_LABELS } from '../services/poi';
import { firstValue, latestValue } from '../services/realEstate';
import type { HexDetail } from '../types';

interface HexDetailViewProps {
  detail: HexDetail;
  onClose: () => void;
}

/**
 * Per-hex detail view shown in the sidebar when a hex is clicked. Replaces the
 * tabs with a focused breakdown: commute + liveability, a detailed price-trend
 * chart for the containing commune, and the nearby amenities.
 */
export function HexDetailView({ detail, onClose }: HexDetailViewProps) {
  const {
    commune,
    time,
    score,
    commuteScore,
    poiScore,
    commuteWeight,
    counts,
    nearbyRadiusM,
    years,
    apartment,
    house,
  } = detail;

  const cw = Math.round(commuteWeight * 100);
  const poiLines = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const hasPrice =
    !!years &&
    !!apartment &&
    !!house &&
    (latestValue(apartment) != null || latestValue(house) != null);

  const priceRow = (label: string, series: (number | null)[], color: string) => {
    const last = latestValue(series);
    if (last == null) return null;
    const first = firstValue(series);
    const pct = first ? Math.round(((last - first) / first) * 100) : null;
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-gray-600">
          <span style={{ background: color }} className="inline-block w-2.5 h-2.5 rounded-sm" />
          {label}
        </span>
        <span className="font-mono text-gray-700">
          {Math.round(last).toLocaleString('de-DE')} €/m²{' '}
          {pct != null && (
            <span className={pct >= 0 ? 'text-green-600' : 'text-red-600'}>
              {pct >= 0 ? '+' : ''}
              {pct}%
            </span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div>
      <button
        onClick={onClose}
        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 mb-3"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <h3 className="text-lg font-extrabold text-gray-800 leading-tight">
            {commune ?? 'Outside Luxembourg'}
          </h3>
          <p className="text-[11px] text-gray-400">
            Hex ({detail.q}, {detail.r})
          </p>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-50 rounded-lg text-center">
              <div className="text-xl font-bold text-blue-600 font-mono leading-none">
                {time != null ? Math.round(time) : '–'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">min commute</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg text-center">
              <div className="text-xl font-bold text-blue-600 font-mono leading-none">
                {Math.round(score * 100)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">liveability /100</div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            {cw}% commute ({commuteScore.toFixed(2)}) + {100 - cw}% amenities ({poiScore.toFixed(2)})
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Price trend (€/m²)</label>
          {hasPrice ? (
            <>
              <PriceChart years={years as number[]} apartment={apartment as (number | null)[]} house={house as (number | null)[]} />
              <div className="space-y-1 mt-2">
                {priceRow('Apartment', apartment as (number | null)[], '#2563eb')}
                {priceRow('House', house as (number | null)[], '#ea580c')}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                {detail.priceSource ?? ''} — advertised prices, not prices paid.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-gray-400 text-center py-3 bg-gray-50 rounded-lg leading-snug">
              {commune
                ? 'No price data for this commune.'
                : 'Outside Luxembourg — no price data.'}{' '}
              Load prices in the <b>Immo</b> tab.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Nearby ({nearbyRadiusM / 1000} km)
          </label>
          {poiLines.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
              {poiLines.map(([cat, count]) => (
                <div key={cat} className="flex justify-between">
                  <span>{POI_LABELS[cat] ?? cat}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">No amenities loaded, or none nearby.</p>
          )}
        </div>
      </div>
    </div>
  );
}
