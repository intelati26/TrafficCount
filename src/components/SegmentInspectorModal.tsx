import React from 'react';
import { 
  X, 
  MapPin, 
  Truck, 
  Clock, 
  Calendar, 
  Layers, 
  Bookmark, 
  Download, 
  Activity, 
  TrendingUp, 
  CheckCircle2 
} from 'lucide-react';
import { TrafficSegment } from '../types/traffic';
import { trafficDb } from '../services/db';
import { downloadFile } from '../utils/exportUtils';

interface SegmentInspectorModalProps {
  segment: TrafficSegment | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const SegmentInspectorModal: React.FC<SegmentInspectorModalProps> = ({
  segment,
  onClose,
  onRefresh
}) => {
  if (!segment) return null;

  const handleArchive = async () => {
    await trafficDb.archiveSegment(segment, 'Archived via Segment Inspector Modal');
    onRefresh();
    alert(`Snapshot of ${segment.route} (${segment.county} Co.) saved to local database!`);
  };

  const handleExportDossier = () => {
    downloadFile(
      JSON.stringify(segment, null, 2),
      `MoDOT_Segment_${segment.route}_${segment.county}_Dossier.json`,
      'application/json'
    );
  };

  // Historical AADT array
  const historyYears = [
    { year: '2018', aadt: segment.aadt2018 },
    { year: '2019 (Baseline)', aadt: segment.aadt2019 },
    { year: '2020 (COVID)', aadt: segment.aadt2020 },
    { year: '2021', aadt: segment.aadt2021 },
    { year: '2022', aadt: segment.aadt2022 },
    { year: '2023', aadt: segment.aadt2023 },
    { year: '2024 (Current)', aadt: segment.aadtCurrent }
  ];

  const maxHistoricalAadt = Math.max(...historyYears.map((h) => h.aadt), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
              segment.routeType === 'Interstate' ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-slate-800 text-slate-200'
            }`}>
              {segment.route}
            </span>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{segment.description}</h3>
              <span className="text-[11px] text-slate-400">
                {segment.county} County · Logmile {segment.logmileStart} to {segment.logmileEnd}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">2024 Current AADT</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                {segment.aadtCurrent.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">Vehicles per day</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">Commercial Trucks</span>
              <span className="text-lg font-bold font-mono text-amber-400 mt-0.5 block">
                {segment.commercialPercent}%
              </span>
              <span className="text-[10px] text-slate-500">{segment.commercialAadt.toLocaleString()} trucks/day</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">Peak Hour Volume</span>
              <span className="text-lg font-bold font-mono text-sky-400 mt-0.5 block">
                {segment.peakHourVolume.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">K-factor: {Math.round(segment.kFactor * 100)}%</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">Design Specs</span>
              <span className="text-base font-bold text-slate-200 mt-0.5 block">
                {segment.lanes} Lanes
              </span>
              <span className="text-[10px] text-slate-500">{segment.speedLimit} mph limit</span>
            </div>
          </div>

          {/* Historical Multi-Year AADT Bar Chart */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                7-Year AADT Volume Trend (2018 - 2024)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                MoDOT TMS Historical Archive
              </span>
            </div>

            <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-slate-800">
              {historyYears.map((h) => {
                const heightPct = Math.round((h.aadt / maxHistoricalAadt) * 100);
                const isCurrent = h.year.includes('Current');
                const isCovid = h.year.includes('COVID');

                return (
                  <div key={h.year} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-white pointer-events-none whitespace-nowrap">
                      {h.aadt.toLocaleString()} vpd
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isCurrent 
                          ? 'bg-emerald-500' 
                          : isCovid 
                            ? 'bg-slate-700' 
                            : 'bg-emerald-700/80 group-hover:bg-emerald-600'
                      }`}
                    />

                    <span className="text-[9px] text-slate-400 mt-2 font-mono text-center truncate w-full">
                      {h.year.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commercial Classification Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-300 block">Truck Classification</span>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Single-Unit Trucks (Class 5-7):</span>
                <span className="font-mono font-bold text-slate-200">{segment.singleUnitTrucks.toLocaleString()} vpd</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Combination Semis (Class 8-13):</span>
                <span className="font-mono font-bold text-amber-400">{segment.combinationTrucks.toLocaleString()} vpd</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-300 block">Traffic Engineering Factors</span>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Directional Split (D-Factor):</span>
                <span className="font-mono font-bold text-slate-200">{Math.round(segment.dFactor * 100)}% / {100 - Math.round(segment.dFactor * 100)}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Functional Class:</span>
                <span className="font-mono text-slate-300">{segment.functionalClass}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleExportDossier}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Segment JSON</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs transition shadow-sm"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Archive Snapshot to Local DB</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
