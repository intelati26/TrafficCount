import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  PlusCircle, 
  Eye, 
  Bookmark, 
  FileSpreadsheet, 
  MapPin, 
  Truck, 
  Activity,
  CheckCircle2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { TrafficSegment, MoDOTDistrictId } from '../types/traffic';
import { MODOT_DISTRICTS } from '../data/modotData';
import { trafficDb, CustomCountRecord } from '../services/db';
import { queryDb } from '../services/queryDb';
import { exportSegmentsToCSV, exportSegmentsToGeoJSON, downloadFile } from '../utils/exportUtils';

interface DataGridTableProps {
  segments: TrafficSegment[];
  onSelectSegment: (segment: TrafficSegment) => void;
  onRefreshData: () => void;
  /** When the state has built data, search/sort/paging run over ALL of it in SQL instead of the in-memory subset. */
  stateCode?: string;
  stateLabel?: string;
}

type SortField = 'route' | 'county' | 'districtId' | 'aadtCurrent' | 'aadt2023' | 'commercialAadt' | 'commercialPercent' | 'peakHourVolume' | 'lanes' | 'speedLimit';

export const DataGridTable: React.FC<DataGridTableProps> = ({
  segments,
  onSelectSegment,
  onRefreshData,
  stateCode,
  stateLabel
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [minAadt, setMinAadt] = useState<number>(0);
  const [minTruckPercent, setMinTruckPercent] = useState<number>(0);

  // Only the first N rows are put in the DOM (states can hold tens of thousands of segments)
  const [visibleCount, setVisibleCount] = useState<number>(250);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('aadtCurrent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Custom Count Study Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [customForm, setCustomForm] = useState({
    routeName: '',
    location: '',
    county: '',
    districtId: 'district-5-cd',
    countDate: new Date().toISOString().split('T')[0],
    totalAadt: 15000,
    truckPercent: 12.0,
    observerName: '',
    notes: ''
  });

  // Whole-state mode: the in-memory list is only the busiest 20,000 segments, so with built data the table queries the Parquet file directly.
  const PAGE_SIZE = 200;
  const [page, setPage] = useState<number>(0);
  const [sql, setSql] = useState<{ rows: TrafficSegment[]; total: number } | null>(null);
  const [sqlBusy, setSqlBusy] = useState<boolean>(false);
  const [districtList, setDistrictList] = useState<{ id: string; n: number }[] | null>(null);
  const [debounced, setDebounced] = useState<string>('');
  useEffect(() => { const t = setTimeout(() => setDebounced(searchQuery), 250); return () => clearTimeout(t); }, [searchQuery]);
  useEffect(() => { setPage(0); }, [stateCode, debounced, selectedDistrict, minAadt, minTruckPercent, sortField, sortDirection]);
  useEffect(() => {
    let alive = true; setDistrictList(null);
    if (stateCode) queryDb.has(stateCode, 'seg').then((h) => h ? queryDb.districts(stateCode) : null).then((d) => { if (alive) setDistrictList(d); }).catch(() => {});
    return () => { alive = false; };
  }, [stateCode]);
  useEffect(() => {
    let alive = true;
    if (!stateCode) { setSql(null); return; }
    setSqlBusy(true);
    queryDb.has(stateCode, 'seg').then(async (has) => {
      if (!has) { if (alive) setSql(null); return; }
      const r = await queryDb.grid(stateCode, { search: debounced, district: selectedDistrict, minAadt, minTruckPct: minTruckPercent, sort: sortField, dir: sortDirection, limit: PAGE_SIZE, offset: page * PAGE_SIZE, recentOnly: false });
      if (alive) setSql(r);
    }).catch((e) => console.warn('Grid query failed:', e)).finally(() => { if (alive) setSqlBusy(false); });
    return () => { alive = false; };
  }, [stateCode, debounced, selectedDistrict, minAadt, minTruckPercent, sortField, sortDirection, page]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filtered & Sorted segments
  const processedSegments = useMemo(() => {
    if (sql) return sql.rows; // already filtered, sorted and paged in SQL
    return segments
      .filter((seg) => {
        if (selectedDistrict !== 'all' && seg.districtId !== selectedDistrict) return false;
        if (seg.aadtCurrent < minAadt) return false;
        if (seg.commercialPercent < minTruckPercent) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchRoute = seg.route.toLowerCase().includes(q);
          const matchCounty = seg.county.toLowerCase().includes(q);
          const matchDesc = seg.description.toLowerCase().includes(q);
          const matchClass = seg.functionalClass.toLowerCase().includes(q);
          if (!matchRoute && !matchCounty && !matchDesc && !matchClass) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [sql, segments, selectedDistrict, minAadt, minTruckPercent, searchQuery, sortField, sortDirection]);

  useEffect(() => { setVisibleCount(250); }, [selectedDistrict, minAadt, minTruckPercent, searchQuery, sortField, sortDirection]);

  // Handle Save Custom Count
  const handleSaveCustomCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.routeName || !customForm.county) return;

    const newRecord: CustomCountRecord = {
      id: `custom-${Date.now()}`,
      routeName: customForm.routeName,
      location: customForm.location,
      county: customForm.county,
      districtId: customForm.districtId,
      countDate: customForm.countDate,
      totalAadt: Number(customForm.totalAadt),
      truckPercent: Number(customForm.truckPercent),
      observerName: customForm.observerName || 'Field Engineer',
      notes: customForm.notes,
      createdAt: new Date().toISOString()
    };

    await trafficDb.put('custom_counts', newRecord);
    setShowAddModal(false);
    onRefreshData();
  };

  const handleExportCSV = async () => {
    // whole-state mode exports every match (up to 100,000 rows), not just the visible page
    const all = sql && stateCode ? (await queryDb.grid(stateCode, { search: debounced, district: selectedDistrict, minAadt, minTruckPct: minTruckPercent, sort: sortField, dir: sortDirection, limit: 100000 })).rows : processedSegments;
    const csv = exportSegmentsToCSV(all);
    downloadFile(csv, `Traffic_Segments_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const handleExportGeoJSON = async () => {
    // geometry is only loaded for the export, capped at 20,000 features
    const all = sql && stateCode ? (await queryDb.grid(stateCode, { search: debounced, district: selectedDistrict, minAadt, minTruckPct: minTruckPercent, sort: sortField, dir: sortDirection, limit: 20000, withGeometry: true })).rows : processedSegments;
    const geojson = exportSegmentsToGeoJSON(all);
    downloadFile(geojson, `Traffic_Segments_${new Date().toISOString().split('T')[0]}.geojson`, 'application/json');
  };

  const handleArchiveSegment = async (seg: TrafficSegment) => {
    await trafficDb.archiveSegment(seg);
    onRefreshData();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-400" />
              {stateLabel ?? 'AADT'} Traffic Database &amp; Query Console
            </span>
            <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
              {sql ? `${sql.total.toLocaleString()} matching segments${sqlBusy ? ' …' : ''}` : `${processedSegments.length} of ${segments.length} Segments`}
            </span>
          </div>

          {/* Action Export & Add Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Custom Count</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportGeoJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export GeoJSON</span>
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search route (I-70), county (Boone), class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* District Select */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex-shrink-0">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All districts</option>
              {sql && districtList
                ? districtList.map((d) => (<option key={d.id} value={d.id}>{d.id} ({d.n.toLocaleString()})</option>))
                : MODOT_DISTRICTS.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
            </select>
          </div>

          {/* Min AADT Slider */}
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400 text-[11px] flex-shrink-0">Min AADT:</span>
            <input
              type="range"
              min="0"
              max="120000"
              step="5000"
              value={minAadt}
              onChange={(e) => setMinAadt(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <span className="font-mono text-emerald-400 text-[11px] w-12 text-right">
              {minAadt > 0 ? `${Math.round(minAadt / 1000)}k` : '0'}
            </span>
          </div>

          {/* Min Truck % Slider */}
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400 text-[11px] flex-shrink-0">Truck %:</span>
            <input
              type="range"
              min="0"
              max="35"
              step="2"
              value={minTruckPercent}
              onChange={(e) => setMinTruckPercent(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="font-mono text-amber-400 text-[11px] w-8 text-right">
              &gt;{minTruckPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] sticky top-0 z-10 select-none">
            <tr>
              <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => handleSort('route')}>
                <div className="flex items-center gap-1">
                  <span>Route</span>
                  {sortField === 'route' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => handleSort('county')}>
                <div className="flex items-center gap-1">
                  <span>County / Area</span>
                  {sortField === 'county' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('aadtCurrent')}>
                <div className="flex items-center justify-end gap-1">
                  <span>2024 AADT</span>
                  {sortField === 'aadtCurrent' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('aadt2023')}>
                <div className="flex items-center justify-end gap-1">
                  <span>2023 AADT</span>
                  {sortField === 'aadt2023' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('commercialPercent')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Truck %</span>
                  {sortField === 'commercialPercent' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('commercialAadt')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Trucks/Day</span>
                  {sortField === 'commercialAadt' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">Lanes / Speed</th>
              <th className="py-2.5 px-3">Functional Class</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {(sql ? processedSegments : processedSegments.slice(0, visibleCount)).map((seg) => (
              <tr 
                key={seg.id}
                onClick={() => onSelectSegment(seg)}
                className="hover:bg-slate-900/80 cursor-pointer transition"
              >
                <td className="py-2.5 px-3 font-bold text-slate-100 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    seg.routeType === 'Interstate' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-slate-800 text-slate-200'
                  }`}>
                    {seg.route}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-300 font-medium whitespace-nowrap">
                  {seg.county} Co.
                </td>
                <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={seg.description}>
                  {seg.description}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                  {seg.aadtCurrent.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                  {seg.aadt2023.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-400 whitespace-nowrap">
                  {seg.commercialPercent}%
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                  {seg.commercialAadt.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-mono whitespace-nowrap">
                  {seg.lanes}L · {seg.speedLimit}mph
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                  {seg.functionalClass}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectSegment(seg)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                      title="Inspect Segment Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleArchiveSegment(seg)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded"
                      title="Archive Snapshot to Local Vault"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sql && sql.total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 py-3 text-xs text-slate-400">
            <button disabled={page === 0 || sqlBusy} onClick={() => setPage((p) => Math.max(0, p - 1))} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200">Previous</button>
            <span>{(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, sql.total).toLocaleString()} of {sql.total.toLocaleString()}</span>
            <button disabled={(page + 1) * PAGE_SIZE >= sql.total || sqlBusy} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200">Next</button>
          </div>
        )}
        {!sql && processedSegments.length > visibleCount && (
          <div className="flex items-center justify-center gap-3 py-3 text-xs text-slate-400">
            <span>Showing {visibleCount.toLocaleString()} of {processedSegments.length.toLocaleString()}</span>
            <button onClick={() => setVisibleCount((n) => n + 500)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200">Show 500 more</button>
            <button onClick={() => setVisibleCount(processedSegments.length)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200">Show all</button>
          </div>
        )}
      </div>

      {/* Record Custom Count Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                Record Custom Traffic Count
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomCount} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Route Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MO-13 or Route J"
                    value={customForm.routeName}
                    onChange={(e) => setCustomForm({ ...customForm, routeName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">County *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boone, Cole, Greene"
                    value={customForm.county}
                    onChange={(e) => setCustomForm({ ...customForm, county: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Location / Cross Street Description</label>
                <input
                  type="text"
                  placeholder="e.g. 1.2 miles North of Route VV"
                  value={customForm.location}
                  onChange={(e) => setCustomForm({ ...customForm, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Total Daily AADT *</label>
                  <input
                    type="number"
                    required
                    value={customForm.totalAadt}
                    onChange={(e) => setCustomForm({ ...customForm, totalAadt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Truck %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customForm.truckPercent}
                    onChange={(e) => setCustomForm({ ...customForm, truckPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Count Date</label>
                  <input
                    type="date"
                    value={customForm.countDate}
                    onChange={(e) => setCustomForm({ ...customForm, countDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Observer / Engineer</label>
                <input
                  type="text"
                  placeholder="Your Name or Agency"
                  value={customForm.observerName}
                  onChange={(e) => setCustomForm({ ...customForm, observerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Field Notes / Methodology</label>
                <textarea
                  rows={2}
                  placeholder="Pneumatic tube counter 48h count adjusted by the agency axle factor..."
                  value={customForm.notes}
                  onChange={(e) => setCustomForm({ ...customForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-sm"
                >
                  Save to Local Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
