import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  Calendar, 
  Truck, 
  MapPin, 
  TrendingUp, 
  BarChart2, 
  PieChart, 
  Info,
  Download,
  Share2
} from 'lucide-react';
import { ContinuousCountStation } from '../types/traffic';
import { downloadFile } from '../utils/exportUtils';

interface ContinuousCountStationViewProps {
  stations: ContinuousCountStation[];
  selectedStation: ContinuousCountStation | null;
  onSelectStation: (station: ContinuousCountStation) => void;
  agency?: string;
  stateName?: string;
}

export const ContinuousCountStationView: React.FC<ContinuousCountStationViewProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  agency = 'DOT',
  stateName = 'this state'
}) => {
  const activeStation = selectedStation || stations[0];
  const [activeTab, setActiveTab] = useState<'hourly' | 'dayOfWeek' | 'monthly' | 'classes'>('hourly');

  if (!activeStation) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center text-slate-400 text-sm space-y-2">
        <p className="font-medium text-slate-300">No continuous-count stations for {stateName}.</p>
        <p className="text-xs">Station profiles (hourly, day-of-week and monthly patterns) are only available for the few states that have them in the bundled sample data. Count coverage for {stateName} is on the map and in the AADT grid.</p>
      </div>
    );
  }

  // Calculate maximum hourly volume for scaling bars
  const maxHourlyVolume = Math.max(...activeStation.hourlyProfile.map((h) => h.volume), 1);
  const maxMonthlyVolume = Math.max(...activeStation.monthlyFactor.map((m) => m.aadt), 1);

  const handleExportStationReport = () => {
    const report = {
      station: activeStation.stationNumber,
      route: activeStation.route,
      county: activeStation.county,
      aadt: activeStation.annualAverageDailyTraffic,
      commercialDaily: activeStation.commercialVehiclesDaily,
      commercialPercentage: activeStation.commercialPercentage,
      peakHour: activeStation.peakHour,
      hourlyProfile: activeStation.hourlyProfile,
      dayOfWeek: activeStation.dayOfWeekFactor,
      monthly: activeStation.monthlyFactor,
      vehicleClasses: activeStation.vehicleClasses,
      exportedAt: new Date().toISOString()
    };

    downloadFile(
      JSON.stringify(report, null, 2),
      `${agency}_${activeStation.stationNumber.replace(/[^a-zA-Z0-9]/g, '_')}_Report.json`,
      'application/json'
    );
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left Sidebar: Station Selector */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/90 flex flex-col flex-shrink-0">
        <div className="p-3.5 border-b border-slate-800">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            {agency} Telemetric ATR Stations
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            24/7/365 Automated Traffic Recorders (CCS)
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {stations.map((sta) => {
            const isSelected = activeStation.id === sta.id;
            return (
              <div
                key={sta.id}
                onClick={() => onSelectStation(sta)}
                className={`p-3 rounded-lg cursor-pointer transition text-xs space-y-1 ${
                  isSelected
                    ? 'bg-slate-800 border border-emerald-500/50 shadow-md'
                    : 'hover:bg-slate-850 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{sta.stationNumber}</span>
                  <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
                    {sta.route}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1">
                  {sta.locationDescription}
                </div>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
                  <span>{sta.county} Co.</span>
                  <span className="text-slate-300 font-bold">{sta.annualAverageDailyTraffic.toLocaleString()} AADT</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Telemetry & Analytics Dashboard */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
        {/* Station Header Banner */}
        <div className="p-5 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-950 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded font-mono">
                {activeStation.stationType}
              </span>
              <h2 className="text-lg font-bold text-slate-100">{activeStation.stationNumber}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {activeStation.locationDescription} · {activeStation.county} County (Milepost {activeStation.milepost})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportStationReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Station JSON</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 border-b border-slate-800">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Annual Average Daily Traffic</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {activeStation.annualAverageDailyTraffic.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">Vehicles per day (2-way)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Commercial Heavy Trucks</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {activeStation.commercialVehiclesDaily.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">{activeStation.commercialPercentage}% of total traffic</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Peak Design Hour</span>
            <span className="text-xl font-bold font-mono text-sky-400 mt-1 block">
              {activeStation.peakHourVolume.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">{activeStation.peakHour}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Directional Coverage</span>
            <span className="text-base font-bold text-slate-200 mt-1 block">
              {activeStation.directionMonitored}
            </span>
            <span className="text-[10px] text-slate-500">Continuous in-pavement loops</span>
          </div>
        </div>

        {/* Analytics Tabs */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 max-w-md">
            <button
              onClick={() => setActiveTab('hourly')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition ${
                activeTab === 'hourly' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24-Hour Diurnal Curve
            </button>
            <button
              onClick={() => setActiveTab('dayOfWeek')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition ${
                activeTab === 'dayOfWeek' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Day of Week
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition ${
                activeTab === 'monthly' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Seasonal / Monthly
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition ${
                activeTab === 'classes' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FHWA 13-Classes
            </button>
          </div>

          {/* Tab 1: 24-Hour Hourly Profile */}
          {activeTab === 'hourly' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    24-Hour Hourly Traffic Volume Distribution
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparing total vehicles (green) against commercial freight trucks (amber).
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                    <span className="text-slate-300">All Vehicles</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                    <span className="text-slate-300">Commercial Trucks</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="h-64 flex items-end gap-1.5 pt-8 pb-4 border-b border-slate-800">
                {activeStation.hourlyProfile.map((hp) => {
                  const heightPercent = Math.round((hp.volume / maxHourlyVolume) * 100);
                  const truckHeightPercent = Math.round((hp.truckVolume / maxHourlyVolume) * 100);

                  return (
                    <div key={hp.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-950 border border-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                        <div className="font-bold">{hp.hour}:00 - {hp.hour + 1}:00</div>
                        <div>Total: {hp.volume.toLocaleString()}</div>
                        <div className="text-amber-400">Trucks: {hp.truckVolume.toLocaleString()}</div>
                      </div>

                      {/* Bar columns */}
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-emerald-500/80 group-hover:bg-emerald-400 rounded-t-sm transition-all"
                        />
                        <div
                          style={{ height: `${truckHeightPercent}%` }}
                          className="w-1.5 bg-amber-500 group-hover:bg-amber-400 rounded-t-sm transition-all"
                        />
                      </div>

                      <span className="text-[10px] text-slate-500 mt-2 font-mono">
                        {hp.hour}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-[11px] text-slate-500 font-mono">
                Hour of Day (00:00 to 23:00 Central Standard Time)
              </div>
            </div>
          )}

          {/* Tab 2: Day of Week Factor */}
          {activeTab === 'dayOfWeek' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                Day of Week Traffic Variation &amp; Expansion Factors
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 pt-2">
                {activeStation.dayOfWeekFactor.map((dow) => (
                  <div key={dow.day} className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center space-y-1">
                    <span className="font-bold text-slate-300 text-xs">{dow.day}</span>
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      {dow.volume.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Factor: <strong className="text-slate-200">{dow.factor}x</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Monthly Variation */}
          {activeTab === 'monthly' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Monthly Seasonal Traffic Variation (Annual Seasonality)
              </h3>

              <div className="h-56 flex items-end gap-2 pt-6 pb-2 border-b border-slate-800">
                {activeStation.monthlyFactor.map((m) => {
                  const hPct = Math.round((m.aadt / maxMonthlyVolume) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-950 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-slate-200 pointer-events-none">
                        {m.aadt.toLocaleString()} AADT
                      </div>
                      <div
                        style={{ height: `${hPct}%` }}
                        className="w-full bg-sky-600/80 group-hover:bg-sky-500 rounded-t-sm transition-all"
                      />
                      <span className="text-[10px] text-slate-400 mt-2 font-mono">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4: FHWA 13-Classes */}
          {activeTab === 'classes' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-400" />
                Federal Highway Administration (FHWA) 13-Vehicle Class Breakdown
              </h3>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                {activeStation.vehicleClasses.map((vc) => (
                  <div key={vc.category} className="p-3 bg-slate-950 flex items-center justify-between gap-4 text-xs">
                    <div className="flex-1">
                      <span className="font-bold text-slate-200 block">{vc.category}</span>
                      <span className="text-[11px] text-slate-500">{vc.description}</span>
                    </div>

                    <div className="w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(vc.percentage * 1.8, 100)}%` }}
                        className={`h-full ${vc.category.includes('Tractor') || vc.category.includes('Single Unit') ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      />
                    </div>

                    <div className="text-right w-28">
                      <span className="font-bold text-slate-100 font-mono block">{vc.percentage}%</span>
                      <span className="text-[10px] text-slate-500 font-mono">{vc.dailyCount.toLocaleString()}/day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
