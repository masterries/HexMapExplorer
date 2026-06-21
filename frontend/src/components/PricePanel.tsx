import { PRICE_SOURCE_URL } from '../services/realEstate';
import type { PriceMetric } from '../types';

interface PricePanelProps {
  loaded: boolean;
  loading: boolean;
  status: string;
  metric: PriceMetric;
  source: string;
  onLoad: () => void;
  onMetricChange: (m: PriceMetric) => void;
}

/**
 * Loads Luxembourg commune-level real-estate asking prices and exposes the
 * apartment/house metric toggle. Each hex inherits the price trend of the
 * commune it falls in; the trend itself shows in the hex popup.
 */
export function PricePanel({
  loaded,
  loading,
  status,
  metric,
  source,
  onLoad,
  onMetricChange,
}: PricePanelProps) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Real estate</h3>
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
        <p className="text-[11px] text-gray-500 leading-snug">
          Commune-level <b>asking prices</b> (€/m²) for Luxembourg, 2010–2025. Each hex
          inherits its commune's price trend — switch <b>Color hexes by</b> to <b>Price</b>
          in the <b>Score</b> tab, and open a hex to see its apartment &amp; house history.
        </p>

        <button
          onClick={onLoad}
          disabled={loading}
          className="w-full py-2.5 px-3 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Loading…' : loaded ? 'Reload prices' : 'Load Luxembourg prices'}
        </button>

        {status && <p className="text-[11px] text-gray-500 text-center">{status}</p>}

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Price layer</label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
            {(['apartment', 'house'] as PriceMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => onMetricChange(m)}
                className={`py-1.5 text-xs font-bold rounded-md transition-colors ${
                  metric === m
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'apartment' ? 'Apartments' : 'Houses'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 leading-tight mt-1">
            Switches which series colors the hexes and drives the on-hex number (k€/m²).
          </p>
        </div>

        <p className="text-[10px] text-gray-400 leading-tight">
          <a
            href={PRICE_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted hover:text-blue-600"
          >
            {source || "Observatoire de l'Habitat · data.public.lu (CC0)"}
          </a>{' '}
          — advertised prices, not prices actually paid. Single-family houses have no
          transaction-price series.
        </p>
      </div>
    </div>
  );
}
