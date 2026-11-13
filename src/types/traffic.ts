export interface StateDistrict {
  id: string;
  name: string;
  code: string; // e.g. "NW", "KC", "SL", "D1", "Metro"
  areaName: string;
  officeCity: string;
  counties: string[];
  highwayMiles: number;
  bridgeCount: number;
  color: string;
}

export interface StateConfig {
  code: string; // "MO", "IL", "KS", "IA", "AR"
  name: string; // "Missouri", "Illinois", "Kansas", "Iowa", "Arkansas"
  agencyName: string; // e.g. "Missouri Department of Transportation"
  agencyAcronym: string; // e.g. "MoDOT"
  websiteUrl: string;
  portalName: string; // e.g. "Traffic Volume Maps & TMS Data Zone"
  bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  borderPoints: [number, number][];
  majorRivers?: { name: string; points: [number, number][] }[];
  districts: StateDistrict[];
  keyCorridors: string[];
  majorCities: {
    name: string;
    coordinates: [number, number];
    isCapital?: boolean;
  }[];
}

export type MoDOTDistrictId = string;

export interface MoDOTDistrict extends StateDistrict {}

export type FunctionalClass = 
  | 'Interstate'
  | 'Freeway & Expressway'
  | 'Other Principal Arterial'
  | 'Minor Arterial'
  | 'Major Collector'
  | 'Minor Collector'
  | 'Local';

export interface TrafficSegment {
  id: string;
  stateCode?: string; // e.g. "MO", "IL", "KS", "IA", "AR" (defaults to "MO")
  route: string; // e.g. "I-70", "US-63", "MO-13", "I-55", "I-80"
  routeType: 'Interstate' | 'US Highway' | 'State Route' | 'Numbered Route' | 'Lettered Route';
  districtId: string;
  county: string;
  description: string;
  logmileStart: number;
  logmileEnd: number;
  lanes: number;
  speedLimit: number;
  functionalClass: FunctionalClass;
  
  // Natural corridor topology linkage
  connectedSegmentIds?: string[]; // IDs of preceding & succeeding segments on the same continuous route
  mileageLength?: number; // segment length in miles
  corridorGroup?: string; // e.g. "I-70 Mainline Corridor"
  
  // AADT counts across recent years
  aadtCurrent: number; // 2024
  aadt2023: number;
  aadt2022: number;
  aadt2021: number;
  aadt2020: number; // COVID dip
  aadt2019: number; // pre-COVID baseline
  aadt2018: number;
  /** Every year available from the source (Parquet builds can hold 20+ years). Keys are years. */
  aadtHistory?: Record<number, number>;
  /** Latest-year core statistics kept in the main data file (lanes, shoulders, crashes, trucks...), keyed by source field name. */
  core?: Record<string, string | number>;
  /** Whether aadt is a two-way total or per direction; ramp/connector sections are flagged because their value is often copied from the mainline. */
  aadtBasis?: string;
  aadtFlag?: string | null;
  segKey?: string;
  countYear?: number;
  
  // Commercial & Classification metrics
  commercialAadt: number;
  commercialPercent: number; // e.g. 18.5 (%)
  singleUnitTrucks: number;
  combinationTrucks: number;
  kFactor: number; // Design Hour Volume % (typically 0.08 - 0.12)
  dFactor: number; // Directional Distribution % (e.g. 0.54)
  peakHourVolume: number;
  
  // Geo coordinates for map rendering
  coordinates: [number, number][]; // [[lng, lat], ...]
  centerPoint: [number, number]; // [lng, lat]
}

export interface ContinuousCountStation {
  id: string;
  stateCode?: string; // "MO", "IL", "KS", "IA", "AR"
  stationNumber: string; // e.g. "CCS-070-01"
  route: string;
  county: string;
  districtId: string;
  locationDescription: string;
  milepost: number;
  stationType: 'ATR (Automatic Traffic Recorder)' | 'WIM (Weigh-in-Motion)' | 'Piezoelectric Classifier';
  directionMonitored: 'Both' | 'Eastbound / Westbound' | 'Northbound / Southbound';
  
  // AADT and hourly
  annualAverageDailyTraffic: number;
  commercialVehiclesDaily: number;
  commercialPercentage: number;
  peakHour: string; // "17:00 - 18:00"
  peakHourVolume: number;
  hourlyProfile: { hour: number; volume: number; truckVolume: number }[]; // 24 hours
  dayOfWeekFactor: { day: string; factor: number; volume: number }[]; // Mon-Sun
  monthlyFactor: { month: string; aadt: number }[]; // Jan-Dec
  
  // FHWA 13-class vehicle breakdown
  vehicleClasses: {
    category: string;
    description: string;
    percentage: number;
    dailyCount: number;
  }[];
  
  coordinates: [number, number]; // [lng, lat]
}

export type DocumentCategory = 
  | 'Statewide Map'
  | 'District Map'
  | 'Urban Area Inset'
  | 'Commercial Vehicle Map'
  | 'Continuous Count Report'
  | 'Historical Archive';

export interface MoDOTMapDocument {
  id: string;
  stateCode?: string; // "MO", "IL", "KS", "IA", "AR"
  agencyAcronym?: string; // "MoDOT", "IDOT", "KDOT", etc.
  title: string;
  year: number;
  category: DocumentCategory;
  districtId?: string;
  districtName?: string;
  format: 'PDF' | 'GeoPDF' | 'TIFF' | 'Shapefile';
  fileSizeMb: number;
  fileSizeBytes: number;
  sha256Hash: string;
  officialUrl: string;
  previewThumbnailUrl?: string;
  description: string;
  coverageArea: string;
  sheetCount: number;
  resolutionDpi: number;
  archivedLocally?: boolean;
  archivedAt?: string;
  notes?: string;
  vectorFeaturesCount?: number;
}

export interface ArchivedItem {
  id: string;
  stateCode?: string;
  originalDocumentId?: string;
  segmentId?: string;
  stationId?: string;
  title: string;
  type: 'document' | 'segment' | 'station' | 'corridor_snapshot' | 'natural_corridor_package';
  dateArchived: string;
  sizeBytes: number;
  tags: string[];
  notes: string;
  dataPayload?: any;
}

export interface CorridorComparison {
  route: string;
  stateCode?: string;
  districtName: string;
  baseYear: number;
  baseAadt: number;
  compareYear: number;
  compareAadt: number;
  absoluteChange: number;
  percentChange: number;
  truckVolumeBase: number;
  truckVolumeCompare: number;
  truckPercentChange: number;
  status: 'Heavy Growth' | 'Moderate Growth' | 'Stable' | 'Decline';
}

export interface NaturalCorridorPackage {
  id: string;
  corridorName: string;
  stateCode: string;
  segments: TrafficSegment[];
  totalMileage: number;
  weightedAadt: number;
  totalDailyVmt: number;
  avgTruckPercent: number;
  startMilepost: number;
  endMilepost: number;
  primaryCounties: string[];
  timestamp: string;
}
