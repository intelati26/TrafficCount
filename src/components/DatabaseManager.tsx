import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  HardDrive, 
  Download, 
  Upload, 
  RotateCcw, 
  Table, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Trash2, 
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import { trafficDb, DatabaseStats, CustomCountRecord } from '../services/db';
import { downloadFile } from '../utils/exportUtils';
import { MoDOTMapDocument, TrafficSegment, ContinuousCountStation, ArchivedItem } from '../types/traffic';

interface DatabaseManagerProps {
  onDatabaseChanged: () => void;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ onDatabaseChanged }) => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [activeTable, setActiveTable] = useState<'documents' | 'segments' | 'stations' | 'archives' | 'custom_counts'>('archives');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const s = await trafficDb.getStats();
      setStats(s);

      const rows = await trafficDb.getAll(activeTable);
      setTableData(rows);
    } catch (err) {
      console.error('Failed to load DB stats or table:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTable]);

  // Handle Export Backup JSON
  const handleExportBackup = async () => {
    const jsonStr = await trafficDb.exportDatabase();
    downloadFile(
      jsonStr, 
      `MoDOT_TrafficArchive_DB_Backup_${new Date().toISOString().split('T')[0]}.json`, 
      'application/json'
    );
    setStatusMessage({ text: 'Full database JSON backup downloaded successfully.', type: 'success' });
  };

  // Handle Import Backup JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const res = await trafficDb.importDatabase(content);
      if (res.success) {
        setStatusMessage({ text: res.message, type: 'success' });
        await loadData();
        onDatabaseChanged();
      } else {
        setStatusMessage({ text: res.message, type: 'error' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Reset Database
  const handleReset = async () => {
    if (!window.confirm('Reset database to official MoDOT factory defaults? All custom counts will be cleared.')) {
      return;
    }
    await trafficDb.resetToDefaults();
    setStatusMessage({ text: 'Database reset to official MoDOT catalog defaults.', type: 'success' });
    await loadData();
    onDatabaseChanged();
  };

  // Delete item from current table
  const handleDeleteItem = async (id: string) => {
    await trafficDb.delete(activeTable, id);
    await loadData();
    onDatabaseChanged();
    setStatusMessage({ text: `Record ${id} removed from ${activeTable}.`, type: 'success' });
  };

  // Filtered rows for viewer
  const filteredRows = tableData.filter((row) => {
    if (!tableSearch.trim()) return true;
    const str = JSON.stringify(row).toLowerCase();
    return str.includes(tableSearch.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Hidden File Input for JSON restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Top Header & DB Actions */}
      <div className="p-5 bg-slate-900 border-b border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">
                Embedded Platform-Agnostic Database Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Local persistent storage using standard IndexedDB with localStorage fallback. Zero server dependency, cross-platform compatibility.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import DB Backup (.json)</span>
            </button>

            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full DB (.json)</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 rounded text-xs transition"
              title="Reset to MoDOT Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset DB</span>
            </button>
          </div>
        </div>

        {/* Database Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Engine</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {stats.indexedDbSupported ? 'IndexedDB (Active)' : 'Memory/LocalStorage'}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Local Archives</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                {stats.totalArchives} items
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">MoDOT Map Docs</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                {stats.totalDocuments} files
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">AADT Segments</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                {stats.totalSegments} records
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Custom Counts</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                {stats.totalCustomCounts} studies
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Estimated Storage</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                ~{stats.estimatedStorageKb} KB
              </span>
            </div>
          </div>
        )}

        {/* Status Notification */}
        {statusMessage && (
          <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' 
              : 'bg-red-950/80 border border-red-800 text-red-300'
          }`}>
            <span className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {statusMessage.text}
            </span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Table Browser View */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
        {/* Table Selector Tabs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTable('archives')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTable === 'archives' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              archives ({stats?.totalArchives || 0})
            </button>
            <button
              onClick={() => setActiveTable('documents')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTable === 'documents' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              documents ({stats?.totalDocuments || 0})
            </button>
            <button
              onClick={() => setActiveTable('segments')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTable === 'segments' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              segments ({stats?.totalSegments || 0})
            </button>
            <button
              onClick={() => setActiveTable('stations')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTable === 'stations' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              stations ({stats?.totalStations || 0})
            </button>
            <button
              onClick={() => setActiveTable('custom_counts')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTable === 'custom_counts' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              custom_counts ({stats?.totalCustomCounts || 0})
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={`Filter records in table '${activeTable}'...`}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Record Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No records in table <strong>{activeTable}</strong> matching filter.
            </div>
          ) : (
            filteredRows.map((row) => (
              <div 
                key={row.id}
                className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200">{row.id}</span>
                    {row.title && <span className="text-slate-300 font-semibold">{row.title}</span>}
                    {row.route && <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">{row.route}</span>}
                    {row.stationNumber && <span className="text-emerald-400 font-bold">{row.stationNumber}</span>}
                  </div>

                  <button
                    onClick={() => handleDeleteItem(row.id)}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded transition"
                    title="Delete record from store"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* JSON view preview */}
                <div className="bg-slate-950 rounded p-2 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-24">
                  {JSON.stringify(row, null, 2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
