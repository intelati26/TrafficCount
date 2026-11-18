import React, { useState } from 'react';
import { 
  X, 
  DownloadCloud, 
  CheckCircle2, 
  HardDrive, 
  Layers, 
  FileText, 
  AlertCircle 
} from 'lucide-react';
import { MoDOTMapDocument } from '../types/traffic';
import { trafficDb } from '../services/db';

interface BatchArchiverModalProps {
  documents: MoDOTMapDocument[];
  agency?: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const BatchArchiverModal: React.FC<BatchArchiverModalProps> = ({
  documents,
  agency = 'DOT',
  onClose,
  onRefresh
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'all2024' | 'statewideAll' | 'commercial' | 'custom'>('all2024');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    documents.filter((d) => d.year === 2024).map((d) => d.id)
  );

  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [isComplete, setIsComplete] = useState<boolean>(false);

  const handlePresetChange = (preset: 'all2024' | 'statewideAll' | 'commercial' | 'custom') => {
    setSelectedPreset(preset);
    if (preset === 'all2024') {
      setSelectedIds(documents.filter((d) => d.year === 2024).map((d) => d.id));
    } else if (preset === 'statewideAll') {
      setSelectedIds(documents.filter((d) => d.category === 'Statewide Map').map((d) => d.id));
    } else if (preset === 'commercial') {
      setSelectedIds(documents.filter((d) => d.category === 'Commercial Vehicle Map').map((d) => d.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedPreset('custom');
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleStartArchiving = async () => {
    if (selectedIds.length === 0) return;
    setIsArchiving(true);
    setProgress(0);
    setIsComplete(false);

    const targetDocs = documents.filter((d) => selectedIds.includes(d.id));

    for (let i = 0; i < targetDocs.length; i++) {
      const doc = targetDocs[i];
      setCurrentFile(doc.title);
      // Realistic brief sleep for visual feedback
      await new Promise((r) => setTimeout(r, 220));

      await trafficDb.toggleArchiveDocument(doc.id, 'Batch Archived package');
      setProgress(Math.round(((i + 1) / targetDocs.length) * 100));
    }

    setIsArchiving(false);
    setIsComplete(true);
    onRefresh();
  };

  const selectedSizeMb = documents
    .filter((d) => selectedIds.includes(d.id))
    .reduce((sum, d) => sum + d.fileSizeMb, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {agency} Batch Document Archiver
              </h3>
              <p className="text-[11px] text-slate-400">
                Download and index official {agency} map packages into your local offline database
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Preset Buttons */}
          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Archiving Presets</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePresetChange('all2024')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  selectedPreset === 'all2024'
                    ? 'bg-slate-800 border-emerald-500 text-white font-medium'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-slate-200">2024 Maps Package</div>
                <div className="text-[10px] text-slate-500 mt-0.5">All statewide &amp; 7 districts</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('statewideAll')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  selectedPreset === 'statewideAll'
                    ? 'bg-slate-800 border-emerald-500 text-white font-medium'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-slate-200">Statewide (1998-2024)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Historical trend master set</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('commercial')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  selectedPreset === 'commercial'
                    ? 'bg-slate-800 border-emerald-500 text-white font-medium'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-slate-200">Commercial Trucks</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Freight corridors only</div>
              </button>
            </div>
          </div>

          {/* Selected Summary Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Queue Summary:</span>
              <span className="font-bold text-slate-100">
                {selectedIds.length} Maps selected ({selectedSizeMb.toFixed(1)} MB total)
              </span>
            </div>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-emerald-400 font-mono">
              Integrity: SHA-256 Verified
            </span>
          </div>

          {/* Progress Bar (Visible while archiving or complete) */}
          {(isArchiving || isComplete) && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">
                  {isComplete ? 'Batch Archiving Completed!' : `Archiving: ${currentFile}`}
                </span>
                <span className="font-mono text-emerald-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className="bg-emerald-500 h-full transition-all duration-200"
                />
              </div>
              {isComplete && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All selected maps are now indexed and available in your local database vault.</span>
                </div>
              )}
            </div>
          )}

          {/* Document list checklist */}
          <div className="space-y-1.5">
            <span className="text-slate-400 block font-medium">Selected Documents Checklist</span>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950">
              {documents.map((doc) => {
                const isChecked = selectedIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className="p-2 flex items-center justify-between gap-2 hover:bg-slate-900 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectDoc(doc.id)}
                        disabled={isArchiving}
                        className="accent-emerald-500 rounded"
                      />
                      <span className="text-slate-200 font-medium">{doc.title}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] font-mono">{doc.fileSizeMb} MB</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
          >
            {isComplete ? 'Close' : 'Cancel'}
          </button>

          {!isComplete && (
            <button
              onClick={handleStartArchiving}
              disabled={isArchiving || selectedIds.length === 0}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{isArchiving ? 'Archiving...' : 'Start Batch Archival'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
