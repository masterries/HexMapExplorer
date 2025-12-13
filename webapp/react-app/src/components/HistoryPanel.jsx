import { useState, useEffect } from 'react';
import { loadHistory, saveMapConfig } from '../utils/api';

export function HistoryPanel({ onLoadConfig, currentConfig }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    const data = await loadHistory();
    setHistory(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSave = async () => {
    if (!saveName.trim()) {
      setSaveStatus('Please enter a name');
      setTimeout(() => setSaveStatus(''), 2000);
      return;
    }

    setIsSaving(true);
    const result = await saveMapConfig({
      name: saveName,
      ...currentConfig
    });

    if (result.status === 'success') {
      setSaveStatus('Saved!');
      setSaveName('');
      fetchHistory();
    } else {
      setSaveStatus('Error saving');
    }

    setIsSaving(false);
    setTimeout(() => setSaveStatus(''), 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase text-slate-400 ml-1 tracking-wide">
        Database Actions
      </h3>

      {/* Save Section */}
      <div className="flex gap-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Name this configuration..."
          className="flex-grow p-2.5 text-sm border border-slate-200 rounded-lg
            focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-300"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300
            text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm
            transition-all duration-200 active:scale-95"
        >
          {isSaving ? 'Saving...' : saveStatus || 'Save'}
        </button>
      </div>

      {/* History List */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 max-h-56 overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-500">History</span>
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="text-xs text-blue-500 font-semibold hover:underline disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <ul className="space-y-2">
          {history.length === 0 ? (
            <li className="text-xs text-slate-400 text-center py-6">
              {isLoading ? 'Loading history...' : 'No saved maps yet'}
            </li>
          ) : (
            history.map((item) => (
              <li
                key={item.id}
                onClick={() => onLoadConfig(item)}
                className="group p-3 bg-white rounded-lg border border-slate-100
                  hover:border-blue-400 cursor-pointer shadow-sm
                  transition-all duration-200 hover:shadow-md animate-slide-in"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2 text-[10px] text-slate-400">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">R: {item.radius}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                    Size: {item.hex_size || '0.4'}km
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
