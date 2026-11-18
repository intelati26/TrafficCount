import { 
  MoDOTMapDocument, 
  TrafficSegment, 
  ContinuousCountStation, 
  ArchivedItem,
  NaturalCorridorPackage 
} from '../types/traffic';
import { recordTombstone } from './tombstones';
import { 
  INITIAL_MULTI_STATE_DOCUMENTS, 
  INITIAL_MULTI_STATE_SEGMENTS, 
  INITIAL_MULTI_STATE_STATIONS 
} from '../data/stateRegistry';

export interface CustomCountRecord {
  id: string;
  routeName: string;
  location: string;
  county: string;
  districtId: string;
  countDate: string;
  totalAadt: number;
  truckPercent: number;
  observerName: string;
  notes: string;
  createdAt: string;
}

export interface DatabaseStats {
  totalDocuments: number;
  totalSegments: number;
  totalStations: number;
  totalArchives: number;
  totalCustomCounts: number;
  estimatedStorageKb: number;
  indexedDbSupported: boolean;
  dbVersion: number;
  lastUpdated: string;
}

const DB_NAME = 'MoDOT_Traffic_Archive_DB';
const DB_VERSION = 1;

class TrafficDatabase {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback: {
    documents: MoDOTMapDocument[];
    segments: TrafficSegment[];
    stations: ContinuousCountStation[];
    archives: ArchivedItem[];
    custom_counts: CustomCountRecord[];
  } = {
    documents: [],
    segments: [],
    stations: [],
    archives: [],
    custom_counts: []
  };

  constructor() {
    this.initDatabase();
  }

  private isIndexedDbAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  public async initDatabase(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDbAvailable()) {
      this.initMemoryFallback();
      return null;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('documents')) {
            const docStore = db.createObjectStore('documents', { keyPath: 'id' });
            docStore.createIndex('year', 'year', { unique: false });
            docStore.createIndex('category', 'category', { unique: false });
            docStore.createIndex('districtId', 'districtId', { unique: false });
          }

          if (!db.objectStoreNames.contains('segments')) {
            const segStore = db.createObjectStore('segments', { keyPath: 'id' });
            segStore.createIndex('route', 'route', { unique: false });
            segStore.createIndex('districtId', 'districtId', { unique: false });
            segStore.createIndex('county', 'county', { unique: false });
          }

          if (!db.objectStoreNames.contains('stations')) {
            const staStore = db.createObjectStore('stations', { keyPath: 'id' });
            staStore.createIndex('route', 'route', { unique: false });
            staStore.createIndex('districtId', 'districtId', { unique: false });
          }

          if (!db.objectStoreNames.contains('archives')) {
            const archStore = db.createObjectStore('archives', { keyPath: 'id' });
            archStore.createIndex('type', 'type', { unique: false });
            archStore.createIndex('dateArchived', 'dateArchived', { unique: false });
          }

          if (!db.objectStoreNames.contains('custom_counts')) {
            const countStore = db.createObjectStore('custom_counts', { keyPath: 'id' });
            countStore.createIndex('routeName', 'routeName', { unique: false });
            countStore.createIndex('county', 'county', { unique: false });
          }
        };

        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          await this.seedInitialDataIfEmpty(db);
          resolve(db);
        };

        request.onerror = () => {
          console.warn('IndexedDB failed to open, falling back to LocalStorage memory engine');
          this.initMemoryFallback();
          resolve(null);
        };
      } catch (e) {
        console.warn('IndexedDB initialization error:', e);
        this.initMemoryFallback();
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private initMemoryFallback() {
    try {
      const stored = localStorage.getItem('modot_fallback_db');
      if (stored) {
        this.memoryFallback = JSON.parse(stored);
      } else {
        this.memoryFallback = {
          documents: [...INITIAL_MULTI_STATE_DOCUMENTS],
          segments: [...INITIAL_MULTI_STATE_SEGMENTS],
          stations: [...INITIAL_MULTI_STATE_STATIONS],
          archives: [],
          custom_counts: []
        };
        this.saveMemoryFallback();
      }
    } catch {
      this.memoryFallback = {
        documents: [...INITIAL_MULTI_STATE_DOCUMENTS],
        segments: [...INITIAL_MULTI_STATE_SEGMENTS],
        stations: [...INITIAL_MULTI_STATE_STATIONS],
        archives: [],
        custom_counts: []
      };
    }
  }

  private saveMemoryFallback() {
    try {
      localStorage.setItem('modot_fallback_db', JSON.stringify(this.memoryFallback));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  private async seedInitialDataIfEmpty(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      const tx = db.transaction(['documents', 'segments', 'stations'], 'readwrite');
      const docStore = tx.objectStore('documents');
      const countReq = docStore.count();

      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          // Seed official multi-state baseline
          const docTx = tx.objectStore('documents');
          INITIAL_MULTI_STATE_DOCUMENTS.forEach((doc) => docTx.put(doc));

          const segTx = tx.objectStore('segments');
          INITIAL_MULTI_STATE_SEGMENTS.forEach((seg) => segTx.put(seg));

          const staTx = tx.objectStore('stations');
          INITIAL_MULTI_STATE_STATIONS.forEach((sta) => staTx.put(sta));
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // Generic Get All
  public async getAll<T>(storeName: 'documents' | 'segments' | 'stations' | 'archives' | 'custom_counts'): Promise<T[]> {
    const db = await this.initDatabase();
    if (!db) {
      return (this.memoryFallback[storeName] as unknown as T[]) || [];
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve((this.memoryFallback[storeName] as unknown as T[]) || []);
      }
    });
  }

  // Put / Upsert
  public async put<T extends { id: string }>(
    storeName: 'documents' | 'segments' | 'stations' | 'archives' | 'custom_counts', 
    item: T,
    opts: { keepStamp?: boolean } = {}
  ): Promise<void> {
    // user-owned stores carry updatedAt so notes/settings can be merged between devices (see userState.ts)
    if ((storeName === 'archives' || storeName === 'custom_counts') && !opts.keepStamp) item = { ...item, updatedAt: new Date().toISOString() };
    const db = await this.initDatabase();
    if (!db) {
      const list = this.memoryFallback[storeName] as any[];
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        list[idx] = item;
      } else {
        list.push(item);
      }
      this.saveMemoryFallback();
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Delete
  public async delete(
    storeName: 'documents' | 'segments' | 'stations' | 'archives' | 'custom_counts', 
    id: string,
    opts: { silent?: boolean } = {}
  ): Promise<void> {
    if (!opts.silent) recordTombstone(storeName, id); // remember the deletion so a merge from another device does not resurrect it
    const db = await this.initDatabase();
    if (!db) {
      const list = this.memoryFallback[storeName] as any[];
      this.memoryFallback[storeName] = list.filter((x) => x.id !== id) as any;
      this.saveMemoryFallback();
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Toggle Archive Document Status
  public async toggleArchiveDocument(docId: string, notes?: string): Promise<MoDOTMapDocument | null> {
    const docs = await this.getAll<MoDOTMapDocument>('documents');
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return null;

    const isNowArchived = !doc.archivedLocally;
    const updated: MoDOTMapDocument = {
      ...doc,
      archivedLocally: isNowArchived,
      archivedAt: isNowArchived ? new Date().toISOString() : undefined,
      notes: notes !== undefined ? notes : doc.notes
    };

    await this.put('documents', updated);

    // Also update archive registry
    if (isNowArchived) {
      const archiveItem: ArchivedItem = {
        id: `arch-${doc.id}`,
        originalDocumentId: doc.id,
        title: doc.title,
        type: 'document',
        dateArchived: new Date().toISOString(),
        sizeBytes: doc.fileSizeBytes,
        tags: [doc.category, doc.year.toString(), doc.districtName || 'Statewide'],
        notes: notes || 'Archived official MoDOT map',
        dataPayload: doc
      };
      await this.put('archives', archiveItem);
    } else {
      await this.delete('archives', `arch-${doc.id}`);
    }

    return updated;
  }

  // Save Segment Snapshot
  public async archiveSegment(segment: TrafficSegment, notes: string = ''): Promise<void> {
    const archiveItem: ArchivedItem = {
      id: `arch-seg-${segment.id}-${Date.now()}`,
      segmentId: segment.id,
      title: `${segment.route} - ${segment.county} Co (${segment.description})`,
      type: 'segment',
      dateArchived: new Date().toISOString(),
      sizeBytes: 1024,
      tags: [segment.route, segment.county, segment.functionalClass, `${segment.aadtCurrent.toLocaleString()} AADT`],
      notes: notes || `Snapshot of ${segment.route} AADT data`,
      dataPayload: segment
    };
    await this.put('archives', archiveItem);
  }

  // Get Stats
  public async getStats(): Promise<DatabaseStats> {
    const [docs, segs, stas, archs, counts] = await Promise.all([
      this.getAll<MoDOTMapDocument>('documents'),
      this.getAll<TrafficSegment>('segments'),
      this.getAll<ContinuousCountStation>('stations'),
      this.getAll<ArchivedItem>('archives'),
      this.getAll<CustomCountRecord>('custom_counts')
    ]);

    const totalPayloadSize = JSON.stringify({ docs, segs, stas, archs, counts }).length;

    return {
      totalDocuments: docs.length,
      totalSegments: segs.length,
      totalStations: stas.length,
      totalArchives: archs.length,
      totalCustomCounts: counts.length,
      estimatedStorageKb: Math.round(totalPayloadSize / 1024),
      indexedDbSupported: this.isIndexedDbAvailable(),
      dbVersion: DB_VERSION,
      lastUpdated: new Date().toLocaleTimeString()
    };
  }

  // Full Database Backup / Export
  public async exportDatabase(): Promise<string> {
    const [docs, segs, stas, archs, counts] = await Promise.all([
      this.getAll<MoDOTMapDocument>('documents'),
      this.getAll<TrafficSegment>('segments'),
      this.getAll<ContinuousCountStation>('stations'),
      this.getAll<ArchivedItem>('archives'),
      this.getAll<CustomCountRecord>('custom_counts')
    ]);

    const payload = {
      app: 'MoDOT Traffic Volume Archive Workstation',
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        documents: docs,
        segments: segs,
        stations: stas,
        archives: archs,
        custom_counts: counts
      }
    };

    return JSON.stringify(payload, null, 2);
  }

  // Full Database Restore / Import
  public async importDatabase(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) {
        return { success: false, message: 'Invalid backup file structure: missing "data" key.' };
      }

      const { documents, segments, stations, archives, custom_counts } = parsed.data;

      if (Array.isArray(documents)) {
        for (const doc of documents) await this.put('documents', doc);
      }
      if (Array.isArray(segments)) {
        for (const seg of segments) await this.put('segments', seg);
      }
      if (Array.isArray(stations)) {
        for (const sta of stations) await this.put('stations', sta);
      }
      if (Array.isArray(archives)) {
        for (const arch of archives) await this.put('archives', arch);
      }
      if (Array.isArray(custom_counts)) {
        for (const count of custom_counts) await this.put('custom_counts', count);
      }

      return { success: true, message: 'Database successfully imported and synchronized.' };
    } catch (err: any) {
      return { success: false, message: `Failed to import database: ${err?.message || 'Parse error'}` };
    }
  }

  // Archive Continuous Natural Corridor Package
  public async archiveNaturalCorridorPackage(pkg: NaturalCorridorPackage, notes: string = ''): Promise<void> {
    const archiveItem: ArchivedItem = {
      id: `arch-corridor-${pkg.id}-${Date.now()}`,
      title: `${pkg.corridorName} (${pkg.segments.length} Linked Segments · ${pkg.totalMileage} mi)`,
      type: 'natural_corridor_package',
      stateCode: pkg.stateCode,
      dateArchived: new Date().toISOString(),
      sizeBytes: pkg.segments.length * 1024,
      tags: [
        pkg.stateCode,
        'Natural Corridor',
        `${pkg.segments.length} Segments`,
        `${pkg.totalMileage} mi`,
        `${pkg.weightedAadt.toLocaleString()} W-AADT`
      ],
      notes: notes || `Continuous corridor package with ${pkg.totalDailyVmt.toLocaleString()} daily VMT across ${pkg.primaryCounties.join(', ')} counties.`,
      dataPayload: pkg
    };
    await this.put('archives', archiveItem);
  }

  // Reset to Factory Default
  public async resetToDefaults(): Promise<void> {
    const db = await this.initDatabase();
    if (!db) {
      this.memoryFallback = {
        documents: [...INITIAL_MULTI_STATE_DOCUMENTS],
        segments: [...INITIAL_MULTI_STATE_SEGMENTS],
        stations: [...INITIAL_MULTI_STATE_STATIONS],
        archives: [],
        custom_counts: []
      };
      this.saveMemoryFallback();
      return;
    }

    const stores: ('documents' | 'segments' | 'stations' | 'archives' | 'custom_counts')[] = [
      'documents', 'segments', 'stations', 'archives', 'custom_counts'
    ];

    for (const storeName of stores) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    for (const doc of INITIAL_MULTI_STATE_DOCUMENTS) await this.put('documents', doc);
    for (const seg of INITIAL_MULTI_STATE_SEGMENTS) await this.put('segments', seg);
    for (const sta of INITIAL_MULTI_STATE_STATIONS) await this.put('stations', sta);
  }
}

export const trafficDb = new TrafficDatabase();
