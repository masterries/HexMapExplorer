import { PRICE_SOURCE_URL } from '../services/realEstate';

interface PricePanelProps {
  loaded: boolean;
  loading: boolean;
  status: string;
  source: string;
  onLoad: () => void;
}

/**
 * Loads Luxembourg commune-level real-estate asking prices. The apartment/house
 * metric is chosen in the Score tab (next to the Price color mode); each hex
 * inherits its commune's price trend, shown in the detail view.
 */
export function PricePanel({ loaded, loading, status, source, onLoad }: PricePanelProps) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Real estate</h3>
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
        <p className="text-[11px] text-gray-500 leading-snug">
          Commune-level <b>asking prices</b> (€/m²) for Luxembourg, 2010–2025. Loaded
          automatically when you generate. Switch <b>Color hexes by</b> to <b>Price</b> in the{' '}
          <b>Score</b> tab (and pick Apartments/Houses there); click a hex for its trend.
        </p>

        <button
          onClick={onLoad}
          disabled={loading}
          className="w-full py-2.5 px-3 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Loading…' : loaded ? 'Reload prices' : 'Load Luxembourg prices'}
        </button>

        {status && <p className="text-[11px] text-gray-500 text-center">{status}</p>}

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
