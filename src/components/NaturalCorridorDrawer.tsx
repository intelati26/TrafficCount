import React, { useState } from 'react';
import { 
  GitCommit, 
  Download, 
  HardDrive, 
  Layers, 
  MapPin, 
  Truck, 
  Route, 
  X, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  Trash2,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { TrafficSegment, NaturalCorridorPackage } from '../types/traffic';
import { 
  findSurroundingSegments, 
  buildNaturalCorridorPackage, 
  exportCorridorToGeoJSON, 
  exportCorridorToCSV 
} from '../utils/corridorUtils';
import { downloadFile } from '../utils/exportUtils';
import { trafficDb } from '../services/db';

interface NaturalCorridorDrawerProps {
  selectedSegments: TrafficSegment[];
  allSegments: TrafficSegment[];
  stateCode: string;
  onUpdateSelection: (segments: TrafficSegment[]) => void;
  onClose: () => void;
  onRefreshData: () => void;
}

export const NaturalCorridorDrawer: React.FC<NaturalCorridorDrawerProps> = ({
  selectedSegments,
  allSegments,
  stateCode,
  onUpdateSelection,
  onClose,
  onRefreshData
}) => {
  const [isSavedLocally, setIsSavedLocally] = useState<boolean>(false);

  if (selectedSegments.length === 0) return null;

  const rootSegment = selectedSegments[0];
  const corridorPkg = buildNaturalCorridorPackage(selectedSegments, stateCode);

  // Auto-expand to surrounding adjacent segments (2 hops)
  const handleExpandSurrounding = () => {
    const surrounding = findSurroundingSegments(rootSegment, allSegments, 2);
    onUpdateSelection(surrounding);
    setIsSavedLocally(false);
  };

  // Auto-expand to full continuous highway route
  const handleExpandEntireRoute = () => {
    const fullRoute = allSegments
      .filter((s) => s.route === rootSegment.route && s.stateCode === stateCode)
      .sort((a, b) => a.logmileStart - b.logmileStart);
    onUpdateSelection(fullRoute);
    setIsSavedLocally(false);
  };

  // Remove individual segment from corridor
  const handleRemoveSegment = (segId: string) => {
    const filtered = selectedSegments.filter((s) => s.id !== segId);
    if (filtered.length === 0) {
      onClose();
    } else {
      onUpdateSelection(filtered);
    }
  };

  // Download GeoJSON
  const handleDownloadGeoJSON = () => {
    const geojson = exportCorridorToGeoJSON(corridorPkg);
    downloadFile(
      geojson,
      `${corridorPkg.corridorName.replace(/[^a-zA-Z0-9]/g, '_')}_Natural_Corridor.geojson`,
      'application/json'
    );
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const csv = exportCorridorToCSV(corridorPkg);
    downloadFile(
      csv,
      `${corridorPkg.corridorName.replace(/[^a-zA-Z0-9]/g, '_')}_Natural_Corridor.csv`,
      'text/csv'
    );
  };

  // Archive to Local DB
  const handleArchiveCorridor = async () => {
    await trafficDb.archiveNaturalCorridorPackage(corridorPkg);
    setIsSavedLocally(true);
    onRefreshData();
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-6 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-4 text-xs transition-all max-w-5xl mx-auto">
      {/* Drawer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                Natural Corridor Download &amp; Topology Chain
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] font-semibold">
                {selectedSegments.length} Segments Linked
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {corridorPkg.corridorName} ({stateCode}) · Spanning {corridorPkg.primaryCounties.join(', ')} Counties
            </p>
          </div>
        </div>

        {/* Quick Expansion Tools & Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandSurrounding}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 transition text-[11px] font-medium"
            title="Auto-select adjacent adjoining segments (2 Hops)"
          >
            + Auto-Select Surrounding (2 Hops)
          </button>

          <button
            onClick={handleExpandEntireRoute}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 transition text-[11px] font-medium"
            title="Select all segments on this route across state"
          >
            + Entire Route Corridor
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Corridor Rollup Metrics (4 Key Stats) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-slate-800/80">
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-400 text-[10px] block">Total Continuous Length</span>
          <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
            {corridorPkg.totalMileage} mi
          </span>
          <span className="text-[10px] text-slate-500">Logmile {corridorPkg.startMilepost} to {corridorPkg.endMilepost}</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-400 text-[10px] block">Weighted Average AADT</span>
          <span className="text-base font-bold font-mono text-slate-100 mt-0.5 block">
            {corridorPkg.weightedAadt.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500">Length-weighted volume</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-400 text-[10px] block">Daily Corridor VMT</span>
          <span className="text-base font-bold font-mono text-sky-400 mt-0.5 block">
            {corridorPkg.totalDailyVmt.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500">Vehicle-miles traveled / day</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-400 text-[10px] block">Average Truck Freight</span>
          <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">
            {corridorPkg.avgTruckPercent}%
          </span>
          <span className="text-[10px] text-slate-500">Commercial heavy vehicles</span>
        </div>
      </div>

      {/* Sequential Segment List & Actions Footer */}
      <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
        {/* Linked Segment Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-xl py-0.5">
          {selectedSegments.map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] whitespace-nowrap text-slate-300"
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] flex items-center justify-center font-bold text-slate-400">
                {idx + 1}
              </span>
              <span className="font-bold text-slate-200">{s.route}</span>
              <span className="text-slate-400">({s.county} Co.)</span>
              <span className="font-mono text-emerald-400 font-semibold">{s.aadtCurrent.toLocaleString()}</span>
              {selectedSegments.length > 1 && (
                <button
                  onClick={() => handleRemoveSegment(s.id)}
                  className="text-slate-500 hover:text-red-400 p-0.5"
                  title="Remove from corridor"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Download & Archival Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={handleDownloadGeoJSON}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download GeoJSON</span>
          </button>

          <button
            onClick={handleArchiveCorridor}
            disabled={isSavedLocally}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium transition shadow-sm ${
              isSavedLocally 
                ? 'bg-emerald-950 border border-emerald-700 text-emerald-300' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSavedLocally ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Corridor Archived</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5" />
                <span>Archive Corridor to Local DB</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
