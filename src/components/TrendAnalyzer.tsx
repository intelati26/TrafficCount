import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Calendar, 
  Truck, 
  FileText, 
  Download, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { CORRIDOR_COMPARISONS } from '../data/modotData';
import { CorridorComparison } from '../types/traffic';
import { downloadFile } from '../utils/exportUtils';

export const TrendAnalyzer: React.FC = () => {
  const [corridors] = useState<CorridorComparison[]>(CORRIDOR_COMPARISONS);
  const [selectedCorridor, setSelectedCorridor] = useState<CorridorComparison>(corridors[0]);

  const handleExportCorridorReport = () => {
    const reportText = [
      '==============================================================',
      'MISSOURI DEPARTMENT OF TRANSPORTATION (MoDOT)',
      'STATEWIDE CORRIDOR TRAFFIC VOLUME & FREIGHT TREND REPORT',
      `GENERATED: ${new Date().toLocaleDateString()}`,
      '==============================================================\n',
      ...corridors.map((c) => (
        `CORRIDOR: ${c.route} (${c.districtName})\n` +
        `  Base Year (${c.baseYear}) AADT: ${c.baseAadt.toLocaleString()} vpd\n` +
        `  Compare Year (${c.compareYear}) AADT: ${c.compareAadt.toLocaleString()} vpd\n` +
        `  Net Volume Change: ${c.absoluteChange > 0 ? '+' : ''}${c.absoluteChange.toLocaleString()} vpd (${c.percentChange > 0 ? '+' : ''}${c.percentChange}%)\n` +
        `  Commercial Freight Trucks: ${c.truckVolumeBase.toLocaleString()} -> ${c.truckVolumeCompare.toLocaleString()} (${c.truckPercentChange}%)\n` +
        `  Corridor Status: ${c.status}\n` +
        '--------------------------------------------------------------'
      ))
    ].join('\n');

    downloadFile(reportText, 'MoDOT_Corridor_Trend_Report.txt', 'text/plain');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header Banner */}
      <div className="p-5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            MoDOT Multi-Year Traffic Trend &amp; Freight Growth Analyzer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Comparing pre-pandemic (2019) engineering baselines against current (2024) traffic volumes across major Missouri freight and commuter corridors.
          </p>
        </div>

        <button
          onClick={handleExportCorridorReport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Trend Dossier</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Highlight Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Statewide Average Growth (2019-2024)</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">+5.1%</span>
            <span className="text-[11px] text-slate-500">Above pre-pandemic baseline</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Freight Truck Volume Growth</span>
            <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">+8.6%</span>
            <span className="text-[11px] text-slate-500">Driven by I-44 and I-70 logistics arteries</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Highest Growth Corridor</span>
            <span className="text-xl font-bold text-slate-100 mt-1 block">I-44 Freight Artery</span>
            <span className="text-[11px] text-emerald-400 font-semibold">+12.75% commercial truck traffic</span>
          </div>
        </div>

        {/* Corridor Cards Grid */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-200">
            Missouri Strategic Corridors Comparison Matrix
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {corridors.map((c) => {
              const isSelected = selectedCorridor.route === c.route;
              return (
                <div
                  key={c.route}
                  onClick={() => setSelectedCorridor(c)}
                  className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition space-y-3 ${
                    isSelected ? 'border-emerald-500/70 shadow-lg' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{c.route}</h4>
                      <span className="text-xs text-slate-400">{c.districtName}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      c.status === 'Heavy Growth'
                        ? 'bg-amber-950 border border-amber-800 text-amber-300'
                        : 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Volume Delta Bar */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">2019 Baseline</span>
                      <span className="text-base font-bold font-mono text-slate-300">
                        {c.baseAadt.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">2024 Current</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-base font-bold font-mono text-emerald-400">
                          {c.compareAadt.toLocaleString()}
                        </span>
                        <span className="text-xs text-emerald-400 font-mono">
                          (+{c.percentChange}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Commercial Freight Metric */}
                  <div className="bg-slate-950 rounded-lg p-2.5 flex items-center justify-between text-xs border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      Commercial Truck Volume
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      +{c.truckPercentChange}% ({c.truckVolumeBase.toLocaleString()} → {c.truckVolumeCompare.toLocaleString()}/day)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Corridor In-Depth Engineering Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">
                Detailed Corridor Engineering Profile
              </span>
              <h3 className="text-base font-bold text-slate-100 mt-0.5">
                {selectedCorridor.route}
              </h3>
            </div>
            <span className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-slate-200">
              MoDOT Planning &amp; Programming Division
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block">Net Daily Volume Growth</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                +{selectedCorridor.absoluteChange.toLocaleString()} vpd
              </span>
              <p className="text-[11px] text-slate-500">
                Additional vehicles traversing this segment daily compared to 2019.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block">Freight Volume Expansion</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                +{selectedCorridor.truckPercentChange}%
              </span>
              <p className="text-[11px] text-slate-500">
                Heavy multi-unit commercial trucks (Class 9-13).
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block">Capacity Assessment</span>
              <span className="text-lg font-bold text-slate-200">
                {selectedCorridor.route.includes('I-70') ? 'Widening to 6 Lanes Underway' : 'Adequate Corridor LOS'}
              </span>
              <p className="text-[11px] text-slate-500">
                MoDOT STIP (Statewide Transportation Improvement Program) priority.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
