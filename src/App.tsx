import { queryDb } from './services/queryDb';
import { STATE_META } from './data/stateMeta';
import type { MapViewport } from './components/GisMapViewer';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header, ActiveView } from './components/Header';
import { GisMapViewer } from './components/GisMapViewer';
import { DocumentArchiveViewer } from './components/DocumentArchiveViewer';
import { DataGridTable } from './components/DataGridTable';
import { ContinuousCountStationView } from './components/ContinuousCountStationView';
import { TrendAnalyzer } from './components/TrendAnalyzer';
import { DatabaseManager } from './components/DatabaseManager';
import { DataPacks } from './components/DataPacks';
import { SegmentInspectorModal } from './components/SegmentInspectorModal';
import { BatchArchiverModal } from './components/BatchArchiverModal';
import { InstallPlatformModal } from './components/InstallPlatformModal';
import { StateSelectorModal } from './components/StateSelectorModal';
import { NaturalCorridorDrawer } from './components/NaturalCorridorDrawer';

import { 
  trafficDb, 
  DatabaseStats 
} from './services/db';
import { 
  TrafficSegment, 
  ContinuousCountStation, 
  MoDOTMapDocument,
  StateConfig 
} from './types/traffic';
import { 
  STATE_CONFIGS, 
  INITIAL_MULTI_STATE_SEGMENTS, 
  INITIAL_MULTI_STATE_STATIONS, 
  INITIAL_MULTI_STATE_DOCUMENTS 
} from './data/stateRegistry';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('map');
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

  // Multi-State Architecture
  const [availableStates, setAvailableStates] = useState<Record<string, StateConfig>>(STATE_CONFIGS);
  const [activeStateCode, setActiveStateCode] = useState<string>('MO');

  // Core Data
  const [segments, setSegments] = useState<TrafficSegment[]>(INITIAL_MULTI_STATE_SEGMENTS);
  const [stations, setStations] = useState<ContinuousCountStation[]>(INITIAL_MULTI_STATE_STATIONS);
  const [documents, setDocuments] = useState<MoDOTMapDocument[]>(INITIAL_MULTI_STATE_DOCUMENTS);

  // Natural Corridor Multi-Segment Selection
  const [selectedSegments, setSelectedSegments] = useState<TrafficSegment[]>([]);
  const [selectedStation, setSelectedStation] = useState<ContinuousCountStation | null>(null);

  // Inspector & Modals
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isBatchArchiverOpen, setIsBatchArchiverOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isStateSelectorOpen, setIsStateSelectorOpen] = useState<boolean>(false);

  // Active State Config
  const activeStateConfig = useMemo(() => {
    return availableStates[activeStateCode] || availableStates['MO'] || STATE_CONFIGS['MO'];
  }, [availableStates, activeStateCode]);

  // Refresh DB Data
  const refreshData = useCallback(async () => {
    try {
      const [docList, segList, staList, stats] = await Promise.all([
        trafficDb.getAll<MoDOTMapDocument>('documents'),
        trafficDb.getAll<TrafficSegment>('segments'),
        trafficDb.getAll<ContinuousCountStation>('stations'),
        trafficDb.getStats()
      ]);

      if (docList && docList.length > 0) setDocuments(docList);
      if (segList && segList.length > 0) setSegments(segList);
      if (staList && staList.length > 0) setStations(staList);
      setDbStats(stats);
    } catch (err) {
      console.warn('Failed to refresh data from DB:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Viewport-driven map segments (null = not using Parquet, map shows the bundled/IndexedDB set)
  const [mapSegments, setMapSegments] = useState<TrafficSegment[] | null>(null);
  const viewportReq = React.useRef(0);
  const handleViewportChange = useCallback(async (v: MapViewport) => {
    if (!(await queryDb.has(activeStateCode, 'seg'))) return;
    const id = ++viewportReq.current;
    // zoomed out: only the main network at low-res; zoom in for lesser roads at full detail
    const classes = v.zoom < 1.3 ? ['Interstate', 'Freeway & Expressway']
      : v.zoom < 2.5 ? ['Interstate', 'Freeway & Expressway', 'Other Principal Arterial']
      : v.zoom < 3.5 ? ['Interstate', 'Freeway & Expressway', 'Other Principal Arterial', 'Minor Arterial', 'Major Collector'] : undefined;
    try {
      const segs = await queryDb.segments(activeStateCode, { bbox: v.bbox, classes, lowRes: v.zoom < 2.5, limit: v.zoom >= 3.5 ? 30000 : v.zoom >= 1.3 ? 20000 : 30000, recentOnly: !v.historical, mainlineOnly: v.zoom < 2.5, sample: v.zoom < 2.5 });
      if (id === viewportReq.current) setMapSegments(segs);
    } catch (e) { console.warn('Viewport query failed:', e); }
  }, [activeStateCode]);
  useEffect(() => { setMapSegments(null); viewportReq.current++; }, [activeStateCode]);

  // Every state with built data can be opened: states without a hand-written config get a basic one (bounds from the data itself).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const built = await queryDb.states();
      for (const code of built) {
        if (cancelled) return;
        const meta = STATE_META[code];
        if (!meta || availableStates[code]) continue;
        const b = await queryDb.bounds(code);
        if (!b || cancelled) continue;
        const padX = (b.maxLng - b.minLng) * 0.02, padY = (b.maxLat - b.minLat) * 0.02;
        const bounds = { minLng: b.minLng - padX, maxLng: b.maxLng + padX, minLat: b.minLat - padY, maxLat: b.maxLat + padY };
        const cfg: StateConfig = {
          code, name: meta.name, agencyName: meta.agency, agencyAcronym: meta.acronym, websiteUrl: '',
          portalName: `${meta.acronym} traffic data (built locally)`, bounds,
          borderPoints: [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.minLat], [bounds.maxLng, bounds.maxLat], [bounds.minLng, bounds.maxLat], [bounds.minLng, bounds.minLat]],
          districts: [], keyCorridors: [], majorCities: [],
        };
        setAvailableStates((prev) => (prev[code] ? prev : { ...prev, [code]: cfg }));
      }
    })().catch((e) => console.warn('Could not add built states:', e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Overlay user-built Parquet data (public/data/q) for the active state, if present; otherwise keep bundled samples.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await queryDb.available())) return;
      const [segs, stas, docs] = await Promise.all([
        // grid/analysis set: busiest segments with simplified geometry; the map loads full detail by viewport below
        queryDb.segments(activeStateCode, { lowRes: true, limit: 20000, recentOnly: true }), queryDb.stations(activeStateCode), queryDb.documents(activeStateCode)
      ]);
      if (cancelled) return;
      const swap = <T extends { stateCode?: string }>(prev: T[], next: T[]) =>
        next.length ? [...prev.filter((x) => x.stateCode !== activeStateCode), ...next] : prev;
      setSegments((p) => swap(p, segs));
      setStations((p) => swap(p, stas));
      setDocuments((p) => swap(p, docs));
    })().catch((e) => console.warn('Parquet data unavailable, using bundled samples:', e));
    return () => { cancelled = true; };
  }, [activeStateCode]);

  // Handle segment selection (supports single-select or multi-segment corridor chaining)
  const handleSelectSegment = (segment: TrafficSegment, isMultiSelect: boolean = false) => {
    setSelectedStation(null);

    if (isMultiSelect) {
      const exists = selectedSegments.some((s) => s.id === segment.id);
      if (exists) {
        setSelectedSegments(selectedSegments.filter((s) => s.id !== segment.id));
      } else {
        setSelectedSegments([...selectedSegments, segment]);
      }
    } else {
      setSelectedSegments([segment]);
    }
  };

  // Handle station selection
  const handleSelectStation = (station: ContinuousCountStation) => {
    setSelectedStation(station);
    setSelectedSegments([]);
    setActiveView('telemetry');
  };

  // Add custom registered state
  const handleAddCustomState = (newConfig: StateConfig) => {
    setAvailableStates((prev) => ({
      ...prev,
      [newConfig.code]: newConfig
    }));
  };

  // State-filtered datasets for active state
  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => d.stateCode === activeStateCode || !d.stateCode);
  }, [documents, activeStateCode]);

  const filteredSegments = useMemo(() => {
    return segments.filter((s) => s.stateCode === activeStateCode || !s.stateCode);
  }, [segments, activeStateCode]);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => s.stateCode === activeStateCode || !s.stateCode);
  }, [stations, activeStateCode]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        onOpenBatchArchiver={() => setIsBatchArchiverOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenStateSelector={() => setIsStateSelectorOpen(true)}
        activeState={activeStateConfig}
        dbStats={dbStats}
      />

      {/* Main Viewport */}
      <main className="flex-1 relative overflow-hidden">
        {activeView === 'map' && (
          <GisMapViewer
            stateConfig={activeStateConfig}
            segments={mapSegments ?? segments}
            onViewportChange={handleViewportChange}
            stations={stations}
            selectedSegments={selectedSegments}
            selectedStation={selectedStation}
            onSelectSegment={handleSelectSegment}
            onSelectStation={handleSelectStation}
            onClearSelection={() => {
              setSelectedSegments([]);
              setSelectedStation(null);
            }}
            onOpenStateSelector={() => setIsStateSelectorOpen(true)}
            onSelectState={(code) => {
              setActiveStateCode(code);
              setSelectedSegments([]);
            }}
          />
        )}

        {activeView === 'documents' && (
          <DocumentArchiveViewer
            documents={filteredDocuments}
            agency={activeStateConfig.agencyAcronym}
            onDocumentUpdated={refreshData}
          />
        )}

        {activeView === 'database_grid' && (
          <DataGridTable
            segments={filteredSegments}
            stateCode={activeStateCode}
            stateLabel={activeStateConfig.agencyAcronym}
            onSelectSegment={(seg) => {
              handleSelectSegment(seg, false);
              setIsInspectorOpen(true);
            }}
            onRefreshData={refreshData}
          />
        )}

        {activeView === 'telemetry' && (
          <ContinuousCountStationView
            stations={filteredStations}
            agency={activeStateConfig.agencyAcronym}
            stateName={activeStateConfig.name}
            selectedStation={selectedStation}
            onSelectStation={(sta) => setSelectedStation(sta)}
          />
        )}

        {activeView === 'trends' && (
          <TrendAnalyzer stateCode={activeStateCode} stateName={activeStateConfig.name} agency={activeStateConfig.agencyAcronym} />
        )}

        {activeView === 'data_packs' && <DataPacks />}

        {activeView === 'db_manager' && (
          <DatabaseManager
            onDatabaseChanged={refreshData}
          />
        )}

        {/* Natural Corridor Drawer (Mounted when 1 or more segments are selected on the map) */}
        {activeView === 'map' && selectedSegments.length > 0 && (
          <NaturalCorridorDrawer
            selectedSegments={selectedSegments}
            allSegments={segments}
            stateCode={activeStateCode}
            onUpdateSelection={(newSegs) => setSelectedSegments(newSegs)}
            onClose={() => setSelectedSegments([])}
            onRefreshData={refreshData}
            onInspect={(seg) => { setSelectedSegments([seg]); setIsInspectorOpen(true); }}
          />
        )}
      </main>

      {/* Segment Detailed Inspector Modal (when clicking from table) */}
      {isInspectorOpen && selectedSegments.length > 0 && (
        <SegmentInspectorModal
          segment={selectedSegments[0]}
          onClose={() => setIsInspectorOpen(false)}
          onRefresh={refreshData}
        />
      )}

      {/* Batch Archiver Tool Modal */}
      {isBatchArchiverOpen && (
        <BatchArchiverModal
          documents={filteredDocuments}
          agency={activeStateConfig.agencyAcronym}
          onClose={() => setIsBatchArchiverOpen(false)}
          onRefresh={refreshData}
        />
      )}

      {/* Cross-Platform Windows / Linux / Android Installation Modal */}
      {isInstallModalOpen && (
        <InstallPlatformModal
          onClose={() => setIsInstallModalOpen(false)}
        />
      )}

      {/* State DOT Selector & Register Modal */}
      {isStateSelectorOpen && (
        <StateSelectorModal
          activeStateCode={activeStateCode}
          onSelectState={(code) => {
            setActiveStateCode(code);
            setSelectedSegments([]);
          }}
          onAddCustomState={handleAddCustomState}
          availableStates={availableStates}
          onClose={() => setIsStateSelectorOpen(false)}
        />
      )}
    </div>
  );
}
