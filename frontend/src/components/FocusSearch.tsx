import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { geocodeSuggest, type GeoSuggestion } from '../services/nominatim';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface FocusSearchProps {
  commands: Command[];
  onPickPlace: (lat: number, lon: number, label: string) => void;
}

/** Fuzzy subsequence score: -1 if `query` is not a subsequence of `text`,
 *  otherwise a score where lower = tighter match (fewer/smaller gaps). */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  let score = 0;
  let last = -1;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (last >= 0) score += i - last - 1; // penalize gaps
      else score += i; // penalize a late first match
      last = i;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

type Item =
  | { type: 'cmd'; cmd: Command }
  | { type: 'place'; place: GeoSuggestion };

/**
 * Centered focus search at the top of the map: a command palette + place
 * autocomplete (Nominatim, debounced) with fuzzy-matched commands. ⌘/Ctrl+K
 * focuses it; arrow keys + Enter pick a result.
 */
export function FocusSearch({ commands, onPickPlace }: FocusSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<GeoSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ⌘/Ctrl+K focuses the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounced place search (respects Nominatim's rate policy).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPlaces([]);
      return;
    }
    const id = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      geocodeSuggest(q, ctrl.signal)
        .then(setPlaces)
        .catch(() => {
          /* aborted or failed */
        });
    }, 350);
    return () => window.clearTimeout(id);
  }, [query]);

  const matchedCommands = query.trim()
    ? commands
        .map((c) => ({ c, s: fuzzyScore(query.trim(), c.label) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => a.s - b.s)
        .map((x) => x.c)
    : commands;

  const items: Item[] = [
    ...matchedCommands.map((cmd) => ({ type: 'cmd' as const, cmd })),
    ...places.map((place) => ({ type: 'place' as const, place })),
  ];

  useEffect(() => {
    setActive(0);
  }, [query, places.length]);

  const choose = (i: number) => {
    const item = items[i];
    if (!item) return;
    if (item.type === 'cmd') item.cmd.run();
    else onPickPlace(item.place.lat, item.place.lon, item.place.label);
    setQuery('');
    setPlaces([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1100] w-[min(92vw,460px)]">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Search a place or run a command…  (⌘K)"
          className="w-full pl-10 pr-3 py-2.5 rounded-full bg-white/95 backdrop-blur shadow-lg border border-gray-200 text-sm text-gray-700 outline-none focus:border-blue-400 dark:bg-gray-800/95 dark:border-gray-700 dark:text-gray-100"
        />
      </div>

      {open && items.length > 0 && (
        <div className="mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-[60vh] overflow-y-auto">
          {matchedCommands.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase text-gray-400">Commands</div>
              {matchedCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => choose(idx)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                    active === idx ? 'bg-blue-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <span className="text-sm text-gray-700 dark:text-gray-100">{cmd.label}</span>
                  {cmd.hint && <span className="text-[10px] text-gray-400">{cmd.hint}</span>}
                </button>
              ))}
            </div>
          )}
          {places.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase text-gray-400">Places</div>
              {places.map((place, idx) => {
                const i = matchedCommands.length + idx;
                return (
                  <button
                    key={`${place.lat},${place.lon},${idx}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(i)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                      active === i ? 'bg-blue-50 dark:bg-gray-700' : ''
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{place.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
