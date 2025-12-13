import React, { useState, useEffect } from 'react';
import { loadHistory, saveMapConfig } from '../../services/api';

/**
 * History panel for saving and loading map configurations
 */
export function HistoryPanel({ currentConfig, onLoadConfig }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load history on mount
  useEffect(() => {
    refreshHistory();
  }, []);

  const refreshHistory = async () => {
    setIsLoading(true);
    try {
      const data = await loadHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!currentConfig) return;

    setIsSaving(true);
    try {
      const config = {
        ...currentConfig,
        name: saveName || 'Unnamed'
      };
      const result = await saveMapConfig(config);

      if (result.status === 'success') {
        setSaveSuccess(true);
        setSaveName('');
        refreshHistory();
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Network Error');
    }
    setIsSaving(false);
  };

  const handleLoadItem = (item) => {
    onLoadConfig(item);
  };

  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 ml-1">
        Database Actions
      </h3>

      {/* Save Section */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Name configuration..."
          className="flex-grow p-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-4 py-2 rounded-lg text-sm font-bold shadow transition-colors ${
            saveSuccess
              ? 'bg-green-700 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* History List */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 max-h-48 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-500">History</span>
          <button
            onClick={refreshHistory}
            className="text-xs text-blue-500 font-semibold hover:underline"
          >
            Refresh
          </button>
        </div>

        <ul className="space-y-2">
          {isLoading ? (
            <li className="text-xs text-gray-400 text-center animate-pulse py-4">
              Loading...
            </li>
          ) : history.length === 0 ? (
            <li className="text-xs text-gray-400 text-center py-4">
              No history found
            </li>
          ) : (
            history.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onClick={() => handleLoadItem(item)}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Individual history item
 */
function HistoryItem({ item, onClick }) {
  return (
    <li
      onClick={onClick}
      className="group p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-400 cursor-pointer shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-gray-700 text-sm group-hover:text-blue-600 truncate">
          {item.name}
        </span>
        <span className="text-[10px] text-gray-400 font-mono">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>
      <div className="flex gap-2 text-[10px] text-gray-400">
        <span className="bg-gray-100 px-1.5 rounded">R: {item.radius}</span>
        <span className="bg-gray-100 px-1.5 rounded">
          Size: {item.hex_size || '0.4'}km
        </span>
      </div>
    </li>
  );
}

export default HistoryPanel;
