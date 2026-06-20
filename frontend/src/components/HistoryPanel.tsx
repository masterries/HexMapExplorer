import { useState } from 'react';
import type { MapRequest } from '../types';

interface HistoryPanelProps {
  saveName: string;
  onSaveNameChange: (v: string) => void;
  onSave: () => Promise<boolean>;
  history: MapRequest[];
  historyLoading: boolean;
  onRefresh: () => void;
  onLoad: (item: MapRequest) => void;
}

export function HistoryPanel({
  saveName,
  onSaveNameChange,
  onSave,
  history,
  historyLoading,
  onRefresh,
  onLoad,
}: HistoryPanelProps) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = async () => {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      const ok = await onSave();
      if (ok) {
        setSaveState('saved');
        window.setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('idle');
        alert('Error saving configuration');
      }
    } catch {
      setSaveState('idle');
      alert('Network error');
    }
  };

  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Database Actions</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={saveName}
          onChange={(e) => onSaveNameChange(e.target.value)}
          placeholder="Name configuration..."
          className="flex-grow p-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        />
        <button
          onClick={() => void handleSave()}
          className={`text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-colors ${
            saveState === 'saved' ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 max-h-48 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-500">History</span>
          <button className="text-xs text-blue-500 font-semibold hover:underline" onClick={onRefresh}>
            Refresh
          </button>
        </div>
        <ul className="space-y-2">
          {historyLoading ? (
            <li className="text-xs text-gray-400 text-center animate-pulse py-4">Loading...</li>
          ) : history.length === 0 ? (
            <li className="text-xs text-gray-400 text-center py-4">No history found</li>
          ) : (
            history.map((item) => (
              <li
                key={item.id}
                onClick={() => onLoad(item)}
                className="group p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-400 cursor-pointer shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-700 text-sm group-hover:text-blue-600 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2 text-[10px] text-gray-400">
                  <span className="bg-gray-100 px-1.5 rounded">R: {item.radius}</span>
                  <span className="bg-gray-100 px-1.5 rounded">Size: {item.hexSize ?? 0.4}km</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
