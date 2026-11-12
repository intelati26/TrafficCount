import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header, ActiveView } from './components/Header';
import { GisMapViewer } from './components/GisMapViewer';
import { DocumentArchiveViewer } from './components/DocumentArchiveViewer';
import { DataGridTable } from './components/DataGridTable';
import { ContinuousCountStationView } from './components/ContinuousCountStationView';
import { TrendAnalyzer } from './components/TrendAnalyzer';
import { DatabaseManager } from './components/DatabaseManager';
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
            segments={segments}
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
            onDocumentUpdated={refreshData}
          />
        )}

        {activeView === 'database_grid' && (
          <DataGridTable
            segments={filteredSegments}
            onSelectSegment={(seg) => {
              handleSelectSegment(seg, false);
              setIsInspectorOpen(true);
            }}
            onRefreshData={refreshData}
          />
        )}

        {activeView === 'telemetry' && (
          <ContinuousCountStationView
            stations={filteredStations.length > 0 ? filteredStations : stations}
            selectedStation={selectedStation}
            onSelectStation={(sta) => setSelectedStation(sta)}
          />
        )}

        {activeView === 'trends' && (
          <TrendAnalyzer />
        )}

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
