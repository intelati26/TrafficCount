import { StateConfig, TrafficSegment, ContinuousCountStation, MoDOTMapDocument, CorridorComparison } from '../types/traffic';
import { 
  MODOT_DISTRICTS, 
  MODOT_MAP_DOCUMENTS, 
  TRAFFIC_SEGMENTS, 
  CONTINUOUS_COUNT_STATIONS, 
  CORRIDOR_COMPARISONS 
} from './modotData';
import { DETAILED_STATE_BOUNDARIES } from './geographicBoundaries';

const BASE_STATE_CONFIGS: Record<string, StateConfig> = {
  MO: {
    code: 'MO',
    name: 'Missouri',
    agencyName: 'Missouri Department of Transportation',
    agencyAcronym: 'MoDOT',
    websiteUrl: 'https://www.modot.org/traffic-volume-maps',
    portalName: 'MoDOT Traffic Volume Maps & TMS Data Zone',
    bounds: {
      minLng: -95.85,
      maxLng: -89.05,
      minLat: 35.85,
      maxLat: 40.70
    },
    borderPoints: [
      [-95.77, 40.58],
      [-91.73, 40.58],
      [-91.50, 40.38],
      [-91.38, 39.95],
      [-91.20, 39.42],
      [-90.67, 39.00],
      [-90.18, 38.83],
      [-90.18, 38.62],
      [-90.35, 38.25],
      [-89.50, 37.30],
      [-89.15, 36.98],
      [-89.20, 36.50],
      [-89.50, 36.50],
      [-89.55, 36.00],
      [-90.30, 36.00],
      [-90.30, 36.50],
      [-94.61, 36.50],
      [-94.61, 39.10],
      [-94.90, 39.55],
      [-95.30, 40.00],
      [-95.77, 40.35],
      [-95.77, 40.58]
    ],
    districts: MODOT_DISTRICTS,
    keyCorridors: ['I-70', 'I-44', 'I-55', 'I-35', 'I-29', 'I-64', 'US-63', 'US-65', 'US-54', 'US-60'],
    majorCities: [
      { name: 'Kansas City', coordinates: [-94.58, 39.10] },
      { name: 'St. Louis', coordinates: [-90.20, 38.63] },
      { name: 'Jefferson City', coordinates: [-92.17, 38.58], isCapital: true },
      { name: 'Columbia', coordinates: [-92.33, 38.95] },
      { name: 'Springfield', coordinates: [-93.29, 37.21] },
      { name: 'Joplin', coordinates: [-94.51, 37.08] },
      { name: 'Cape Girardeau', coordinates: [-89.52, 37.31] },
      { name: 'St. Joseph', coordinates: [-94.84, 39.77] }
    ]
  },

  IL: {
    code: 'IL',
    name: 'Illinois',
    agencyName: 'Illinois Department of Transportation',
    agencyAcronym: 'IDOT',
    websiteUrl: 'https://idot.illinois.gov/transportation-system/network-overview/traffic-data.html',
    portalName: 'Getting Around Illinois AADT & IDOT GIS Open Data Portal',
    bounds: {
      minLng: -91.55,
      maxLng: -87.45,
      minLat: 36.95,
      maxLat: 42.55
    },
    borderPoints: [
      [-90.65, 42.50],
      [-87.80, 42.50],
      [-87.52, 41.76],
      [-87.52, 39.35],
      [-87.58, 38.00],
      [-88.10, 37.45],
      [-89.15, 36.98],
      [-89.50, 37.30],
      [-90.35, 38.25],
      [-90.18, 38.83],
      [-91.40, 40.35],
      [-90.65, 42.50]
    ],
    districts: [
      { id: 'idot-d1', name: 'District 1 (Chicago Metro)', code: 'D1', areaName: 'Cook, DuPage, Kane, Lake, McHenry, Will', officeCity: 'Schaumburg', counties: ['Cook', 'DuPage', 'Will', 'Lake', 'Kane'], highwayMiles: 2980, bridgeCount: 1650, color: '#ef4444' },
      { id: 'idot-d2', name: 'District 2 (Dixon / Rockford)', code: 'D2', areaName: 'Northwest Illinois', officeCity: 'Dixon', counties: ['Winnebago', 'Boone', 'Ogle', 'Lee'], highwayMiles: 1820, bridgeCount: 780, color: '#3b82f6' },
      { id: 'idot-d4', name: 'District 4 (Peoria)', code: 'D4', areaName: 'Central Western Illinois', officeCity: 'Peoria', counties: ['Peoria', 'Tazewell', 'Knox', 'Woodford'], highwayMiles: 1650, bridgeCount: 710, color: '#10b981' },
      { id: 'idot-d6', name: 'District 6 (Springfield - Capital)', code: 'D6', areaName: 'West Central Illinois', officeCity: 'Springfield', counties: ['Sangamon', 'Morgan', 'Adams', 'Macoupin'], highwayMiles: 2100, bridgeCount: 890, color: '#f59e0b' },
      { id: 'idot-d8', name: 'District 8 (Collinsville / Metro East)', code: 'D8', areaName: 'St. Louis Metro East', officeCity: 'Collinsville', counties: ['Madison', 'St. Clair', 'Monroe', 'Clinton'], highwayMiles: 1740, bridgeCount: 820, color: '#8b5cf6' }
    ],
    keyCorridors: ['I-55', 'I-80', 'I-70', 'I-57', 'I-90', 'I-94', 'I-64', 'I-74', 'US-51', 'US-67'],
    majorCities: [
      { name: 'Chicago', coordinates: [-87.62, 41.87] },
      { name: 'Springfield', coordinates: [-89.65, 39.78], isCapital: true },
      { name: 'Rockford', coordinates: [-89.09, 42.27] },
      { name: 'Peoria', coordinates: [-89.58, 40.69] },
      { name: 'Collinsville / Metro East', coordinates: [-89.98, 38.67] },
      { name: 'Champaign-Urbana', coordinates: [-88.24, 40.11] },
      { name: 'Cairo', coordinates: [-89.17, 37.00] }
    ]
  },

  KS: {
    code: 'KS',
    name: 'Kansas',
    agencyName: 'Kansas Department of Transportation',
    agencyAcronym: 'KDOT',
    websiteUrl: 'https://www.ksdot.gov/bureaus/burtransplan/maps/Traffic.asp',
    portalName: 'KDOT Traffic Volume Maps & TransInfo System',
    bounds: {
      minLng: -102.10,
      maxLng: -94.55,
      minLat: 36.95,
      maxLat: 40.05
    },
    borderPoints: [
      [-102.05, 40.00],
      [-95.30, 40.00],
      [-94.90, 39.55],
      [-94.61, 39.10],
      [-94.61, 37.00],
      [-102.05, 37.00],
      [-102.05, 40.00]
    ],
    districts: [
      { id: 'kdot-d1', name: 'District 1 (Topeka / KC Metro)', code: 'D1', areaName: 'Northeast Kansas', officeCity: 'Topeka', counties: ['Shawnee', 'Johnson', 'Wyandotte', 'Douglas'], highwayMiles: 2420, bridgeCount: 1100, color: '#6366f1' },
      { id: 'kdot-d2', name: 'District 2 (Salina)', code: 'D2', areaName: 'North Central Kansas', officeCity: 'Salina', counties: ['Saline', 'Dickinson', 'McPherson', 'Geary'], highwayMiles: 1890, bridgeCount: 650, color: '#06b6d4' },
      { id: 'kdot-d5', name: 'District 5 (Wichita / Hutchinson)', code: 'D5', areaName: 'South Central Kansas', officeCity: 'Hutchinson', counties: ['Sedgwick', 'Reno', 'Butler', 'Harvey'], highwayMiles: 2310, bridgeCount: 890, color: '#f97316' }
    ],
    keyCorridors: ['I-70', 'I-35', 'I-435', 'I-635', 'US-69', 'US-81', 'US-54', 'US-400'],
    majorCities: [
      { name: 'Topeka', coordinates: [-95.68, 39.05], isCapital: true },
      { name: 'Wichita', coordinates: [-97.33, 37.68] },
      { name: 'Overland Park', coordinates: [-94.67, 38.98] },
      { name: 'Kansas City (KS)', coordinates: [-94.62, 39.11] },
      { name: 'Lawrence', coordinates: [-95.23, 38.97] },
      { name: 'Salina', coordinates: [-97.61, 38.84] }
    ]
  },

  IA: {
    code: 'IA',
    name: 'Iowa',
    agencyName: 'Iowa Department of Transportation',
    agencyAcronym: 'Iowa DOT',
    websiteUrl: 'https://iowadot.gov/maps/traffic-monitoring',
    portalName: 'Iowa DOT Open Data Portal (public-iowadot.opendata.arcgis.com)',
    bounds: {
      minLng: -96.70,
      maxLng: -90.10,
      minLat: 40.35,
      maxLat: 43.55
    },
    borderPoints: [
      [-96.60, 43.50],
      [-91.20, 43.50],
      [-90.65, 42.50],
      [-90.15, 41.50],
      [-91.40, 40.35],
      [-95.77, 40.58],
      [-95.85, 41.25],
      [-96.45, 42.50],
      [-96.60, 43.50]
    ],
    districts: [
      { id: 'iadot-d1', name: 'District 1 (Ames / Des Moines)', code: 'D1', areaName: 'Central Iowa', officeCity: 'Ames', counties: ['Polk', 'Story', 'Dallas', 'Boone'], highwayMiles: 1980, bridgeCount: 750, color: '#eab308' },
      { id: 'iadot-d4', name: 'District 4 (Council Bluffs / SW)', code: 'D4', areaName: 'Southwest Iowa', officeCity: 'Atlantic', counties: ['Pottawattamie', 'Mills', 'Cass', 'Fremont'], highwayMiles: 1640, bridgeCount: 620, color: '#14b8a6' },
      { id: 'iadot-d6', name: 'District 6 (Cedar Rapids / Davenport)', code: 'D6', areaName: 'Eastern Iowa', officeCity: 'Cedar Rapids', counties: ['Linn', 'Scott', 'Johnson', 'Dubuque'], highwayMiles: 2150, bridgeCount: 880, color: '#3b82f6' }
    ],
    keyCorridors: ['I-80', 'I-35', 'I-29', 'I-380', 'US-30', 'US-20', 'US-61'],
    majorCities: [
      { name: 'Des Moines', coordinates: [-93.60, 41.58], isCapital: true },
      { name: 'Cedar Rapids', coordinates: [-91.66, 41.97] },
      { name: 'Davenport', coordinates: [-90.57, 41.52] },
      { name: 'Council Bluffs', coordinates: [-95.86, 41.26] },
      { name: 'Ames', coordinates: [-93.63, 42.03] },
      { name: 'Iowa City', coordinates: [-91.53, 41.66] }
    ]
  },

  AR: {
    code: 'AR',
    name: 'Arkansas',
    agencyName: 'Arkansas Department of Transportation',
    agencyAcronym: 'ARDOT',
    websiteUrl: 'https://www.ardot.gov/divisions/transportation-planning-policy/traffic-volume-maps/',
    portalName: 'ARDOT Traffic Volume Maps & Station Count Archive',
    bounds: {
      minLng: -94.65,
      maxLng: -89.60,
      minLat: 32.95,
      maxLat: 36.55
    },
    borderPoints: [
      [-94.61, 36.50],
      [-89.55, 36.00],
      [-90.15, 35.15],
      [-91.10, 33.85],
      [-91.15, 33.00],
      [-94.04, 33.00],
      [-94.04, 33.60],
      [-94.61, 34.50],
      [-94.61, 36.50]
    ],
    districts: [
      { id: 'ardot-d6', name: 'District 6 (Little Rock Metro)', code: 'D6', areaName: 'Central Arkansas', officeCity: 'Little Rock', counties: ['Pulaski', 'Saline', 'Faulkner', 'Lonoke'], highwayMiles: 1850, bridgeCount: 940, color: '#ec4899' },
      { id: 'ardot-d4', name: 'District 4 (Fort Smith)', code: 'D4', areaName: 'Western Arkansas / River Valley', officeCity: 'Fort Smith', counties: ['Sebastian', 'Crawford', 'Franklin', 'Logan'], highwayMiles: 1620, bridgeCount: 680, color: '#f97316' },
      { id: 'ardot-d9', name: 'District 9 (Fayetteville / Bentonville)', code: 'D9', areaName: 'Northwest Arkansas Metro', officeCity: 'Harrison', counties: ['Washington', 'Benton', 'Boone', 'Carroll'], highwayMiles: 1740, bridgeCount: 710, color: '#10b981' }
    ],
    keyCorridors: ['I-40', 'I-49', 'I-30', 'I-55', 'US-71', 'US-65', 'US-67'],
    majorCities: [
      { name: 'Little Rock', coordinates: [-92.28, 34.74], isCapital: true },
      { name: 'Fayetteville', coordinates: [-94.16, 36.06] },
      { name: 'Bentonville', coordinates: [-94.21, 36.37] },
      { name: 'Fort Smith', coordinates: [-94.41, 35.38] },
      { name: 'Jonesboro', coordinates: [-90.70, 35.84] },
      { name: 'West Memphis', coordinates: [-90.18, 35.14] }
    ]
  },

  TN: {
    code: 'TN',
    name: 'Tennessee',
    agencyName: 'Tennessee Department of Transportation',
    agencyAcronym: 'TDOT',
    websiteUrl: 'https://tdot.ms2soft.com/tcds',
    portalName: 'TN-TIMES Traffic Information Management & TDOT Open Data',
    bounds: {
      minLng: -90.35,
      maxLng: -81.60,
      minLat: 34.95,
      maxLat: 36.70
    },
    borderPoints: [
      [-90.18, 35.15], // Memphis
      [-89.50, 36.50],
      [-81.85, 36.60], // Bristol NE tip
      [-84.30, 35.00], // Chattanooga SE
      [-88.20, 35.00],
      [-90.18, 35.00],
      [-90.18, 35.15]
    ],
    districts: [
      { id: 'tdot-r1', name: 'Region 1 (Knoxville)', code: 'R1', areaName: 'East Tennessee', officeCity: 'Knoxville', counties: ['Knox', 'Blount', 'Anderson'], highwayMiles: 2350, bridgeCount: 1100, color: '#3b82f6' },
      { id: 'tdot-r2', name: 'Region 2 (Chattanooga)', code: 'R2', areaName: 'Southeast Tennessee', officeCity: 'Chattanooga', counties: ['Hamilton', 'Bradley'], highwayMiles: 2180, bridgeCount: 950, color: '#06b6d4' },
      { id: 'tdot-r3', name: 'Region 3 (Nashville Metro)', code: 'R3', areaName: 'Middle Tennessee / Capital', officeCity: 'Nashville', counties: ['Davidson', 'Williamson', 'Rutherford'], highwayMiles: 2890, bridgeCount: 1350, color: '#8b5cf6' },
      { id: 'tdot-r4', name: 'Region 4 (Memphis)', code: 'R4', areaName: 'West Tennessee', officeCity: 'Memphis', counties: ['Shelby', 'Madison', 'Gibson'], highwayMiles: 2450, bridgeCount: 1050, color: '#ef4444' }
    ],
    keyCorridors: ['I-40', 'I-24', 'I-65', 'I-75', 'I-81', 'I-55', 'US-45', 'US-51'],
    majorCities: [
      { name: 'Nashville', coordinates: [-86.78, 36.16], isCapital: true },
      { name: 'Memphis', coordinates: [-90.05, 35.15] },
      { name: 'Knoxville', coordinates: [-83.92, 35.96] },
      { name: 'Chattanooga', coordinates: [-85.31, 35.05] },
      { name: 'Clarksville', coordinates: [-87.36, 36.53] },
      { name: 'Jackson', coordinates: [-88.81, 35.61] }
    ]
  },

  KY: {
    code: 'KY',
    name: 'Kentucky',
    agencyName: 'Kentucky Transportation Cabinet',
    agencyAcronym: 'KYTC',
    websiteUrl: 'https://transportation.ky.gov/Planning/Pages/Traffic-Counts.aspx',
    portalName: 'KYTRAK Open Data Hub & KYTC Traffic Counts',
    bounds: {
      minLng: -89.60,
      maxLng: -81.95,
      minLat: 36.45,
      maxLat: 39.15
    },
    borderPoints: [
      [-89.15, 36.98], // Wickliffe / Ohio river
      [-89.50, 36.50],
      [-84.30, 36.60],
      [-82.00, 37.50], // Pikeville
      [-82.60, 38.50], // Ashland
      [-84.50, 39.10], // Covington / Cincinnati
      [-85.75, 38.25], // Louisville
      [-87.58, 38.00], // Henderson
      [-89.15, 36.98]
    ],
    districts: [
      { id: 'kytc-d5', name: 'District 5 (Louisville Metro)', code: 'D5', areaName: 'North Central Kentucky', officeCity: 'Louisville', counties: ['Jefferson', 'Oldham', 'Bullitt'], highwayMiles: 1840, bridgeCount: 890, color: '#dc2626' },
      { id: 'kytc-d6', name: 'District 6 (Northern Kentucky / Covington)', code: 'D6', areaName: 'Cincinnati Metro Area', officeCity: 'Ft. Mitchell', counties: ['Kenton', 'Campbell', 'Boone'], highwayMiles: 1420, bridgeCount: 650, color: '#f59e0b' },
      { id: 'kytc-d7', name: 'District 7 (Lexington / Bluegrass)', code: 'D7', areaName: 'Central Kentucky', officeCity: 'Lexington', counties: ['Fayette', 'Franklin', 'Scott'], highwayMiles: 1980, bridgeCount: 810, color: '#2563eb' }
    ],
    keyCorridors: ['I-65', 'I-75', 'I-64', 'I-71', 'I-24', 'I-69', 'US-60', 'US-31W'],
    majorCities: [
      { name: 'Frankfort', coordinates: [-84.87, 38.20], isCapital: true },
      { name: 'Louisville', coordinates: [-85.76, 38.25] },
      { name: 'Lexington', coordinates: [-84.50, 38.04] },
      { name: 'Bowling Green', coordinates: [-86.44, 36.99] },
      { name: 'Owensboro', coordinates: [-87.11, 37.77] },
      { name: 'Covington', coordinates: [-84.51, 39.08] },
      { name: 'Paducah', coordinates: [-88.60, 37.08] }
    ]
  },

  NE: {
    code: 'NE',
    name: 'Nebraska',
    agencyName: 'Nebraska Department of Transportation',
    agencyAcronym: 'NDOT',
    websiteUrl: 'https://dot.nebraska.gov/',
    portalName: 'NebraskaMap AADT Counts & NDOT Map Library',
    bounds: {
      minLng: -104.10,
      maxLng: -95.30,
      minLat: 39.95,
      maxLat: 43.05
    },
    borderPoints: [
      [-104.05, 43.00],
      [-98.50, 43.00],
      [-96.45, 42.50], // South Sioux City
      [-95.85, 41.25], // Omaha
      [-95.30, 40.00],
      [-102.05, 40.00],
      [-104.05, 41.00],
      [-104.05, 43.00]
    ],
    districts: [
      { id: 'ndot-d2', name: 'District 2 (Omaha Metro)', code: 'D2', areaName: 'Eastern Nebraska', officeCity: 'Omaha', counties: ['Douglas', 'Sarpy', 'Dodge', 'Washington'], highwayMiles: 1250, bridgeCount: 680, color: '#7c3aed' },
      { id: 'ndot-d1', name: 'District 1 (Lincoln - Capital)', code: 'D1', areaName: 'Southeast Nebraska', officeCity: 'Lincoln', counties: ['Lancaster', 'Gage', 'Seward'], highwayMiles: 1480, bridgeCount: 620, color: '#059669' }
    ],
    keyCorridors: ['I-80', 'I-680', 'I-480', 'US-6', 'US-30', 'US-34', 'US-75', 'US-81'],
    majorCities: [
      { name: 'Lincoln', coordinates: [-96.70, 40.81], isCapital: true },
      { name: 'Omaha', coordinates: [-95.94, 41.26] },
      { name: 'Grand Island', coordinates: [-98.34, 40.92] },
      { name: 'Kearney', coordinates: [-99.08, 40.70] },
      { name: 'North Platte', coordinates: [-100.76, 41.14] }
    ]
  },

  OK: {
    code: 'OK',
    name: 'Oklahoma',
    agencyName: 'Oklahoma Department of Transportation',
    agencyAcronym: 'ODOT',
    websiteUrl: 'https://oklahoma.gov/odot/programs-and-projects/traffic-monitoring.html',
    portalName: 'ODOT Traffic Monitoring & Annual AADT Data Portal',
    bounds: {
      minLng: -103.05,
      maxLng: -94.40,
      minLat: 33.60,
      maxLat: 37.05
    },
    borderPoints: [
      [-103.00, 37.00],
      [-100.00, 37.00],
      [-94.61, 37.00], // Joplin area border
      [-94.45, 35.38], // Fort Smith line
      [-94.40, 33.60], // Red River SE
      [-100.00, 34.50], // SW Red River
      [-100.00, 36.50], // Panhandle step
      [-103.00, 36.50],
      [-103.00, 37.00]
    ],
    districts: [
      { id: 'odot-d4', name: 'Division 4 (Oklahoma City Metro)', code: 'Div4', areaName: 'Central Oklahoma', officeCity: 'Perry', counties: ['Oklahoma', 'Cleveland', 'Logan', 'Canadian'], highwayMiles: 2120, bridgeCount: 920, color: '#d97706' },
      { id: 'odot-d8', name: 'Division 8 (Tulsa Metro / NE)', code: 'Div8', areaName: 'Northeast Oklahoma', officeCity: 'Tulsa', counties: ['Tulsa', 'Rogers', 'Wagoner', 'Creek'], highwayMiles: 1980, bridgeCount: 880, color: '#0284c7' }
    ],
    keyCorridors: ['I-35', 'I-40', 'I-44', 'US-69', 'US-75', 'US-412', 'US-81'],
    majorCities: [
      { name: 'Oklahoma City', coordinates: [-97.51, 35.47], isCapital: true },
      { name: 'Tulsa', coordinates: [-95.99, 36.15] },
      { name: 'Norman', coordinates: [-97.44, 35.22] },
      { name: 'Edmond', coordinates: [-97.48, 35.65] },
      { name: 'Lawton', coordinates: [-98.39, 34.61] }
    ]
  },

  TX: {
    code: 'TX',
    name: 'Texas',
    agencyName: 'Texas Department of Transportation',
    agencyAcronym: 'TxDOT',
    websiteUrl: 'https://www.txdot.gov/operations/data-maps/traffic-count-maps.html',
    portalName: 'TxDOT STARS II & Open Data GIS Portal',
    bounds: {
      minLng: -106.65,
      maxLng: -93.50,
      minLat: 25.80,
      maxLat: 36.50
    },
    borderPoints: [
      [-106.50, 31.75], // El Paso
      [-103.00, 32.00], // New Mexico line
      [-103.00, 36.50], // Panhandle NW
      [-100.00, 36.50], // Panhandle NE
      [-100.00, 34.50], // Red River step
      [-94.04, 33.60],  // Texarkana
      [-93.85, 30.00],  // Sabine River
      [-93.85, 29.70],  // Gulf coast
      [-97.10, 26.00],  // Brownsville
      [-99.50, 27.50],  // Laredo Rio Grande
      [-104.50, 30.50], // Big Bend
      [-106.50, 31.75]
    ],
    districts: [
      { id: 'txdot-hou', name: 'Houston District', code: 'HOU', areaName: 'Harris, Fort Bend, Montgomery', officeCity: 'Houston', counties: ['Harris', 'Fort Bend', 'Montgomery'], highwayMiles: 3450, bridgeCount: 2200, color: '#ef4444' },
      { id: 'txdot-dal', name: 'Dallas District', code: 'DAL', areaName: 'Dallas, Collin, Denton, Rockwall', officeCity: 'Mesquite', counties: ['Dallas', 'Collin', 'Denton'], highwayMiles: 3120, bridgeCount: 1980, color: '#3b82f6' },
      { id: 'txdot-ftw', name: 'Fort Worth District', code: 'FTW', areaName: 'Tarrant, Parker, Johnson, Wise', officeCity: 'Fort Worth', counties: ['Tarrant', 'Parker', 'Johnson'], highwayMiles: 2680, bridgeCount: 1450, color: '#8b5cf6' },
      { id: 'txdot-aus', name: 'Austin District', code: 'AUS', areaName: 'Travis, Williamson, Hays, Bastrop', officeCity: 'Austin', counties: ['Travis', 'Williamson', 'Hays'], highwayMiles: 2450, bridgeCount: 1320, color: '#10b981' },
      { id: 'txdot-sat', name: 'San Antonio District', code: 'SAT', areaName: 'Bexar, Comal, Guadalupe, Medina', officeCity: 'San Antonio', counties: ['Bexar', 'Comal', 'Guadalupe'], highwayMiles: 2780, bridgeCount: 1410, color: '#f59e0b' }
    ],
    keyCorridors: ['I-35', 'I-10', 'I-45', 'I-20', 'I-30', 'US-290', 'US-59', 'State Highway 130'],
    majorCities: [
      { name: 'Austin', coordinates: [-97.74, 30.27], isCapital: true },
      { name: 'Houston', coordinates: [-95.37, 29.76] },
      { name: 'Dallas', coordinates: [-96.80, 32.78] },
      { name: 'San Antonio', coordinates: [-98.49, 29.42] },
      { name: 'Fort Worth', coordinates: [-97.33, 32.75] },
      { name: 'El Paso', coordinates: [-106.49, 31.76] }
    ]
  },

  IN: {
    code: 'IN',
    name: 'Indiana',
    agencyName: 'Indiana Department of Transportation',
    agencyAcronym: 'INDOT',
    websiteUrl: 'https://www.in.gov/indot/traffic-monitoring/',
    portalName: 'INDOT Traffic Count Database System (TCDS) & Open Data',
    bounds: {
      minLng: -88.10,
      maxLng: -84.75,
      minLat: 37.75,
      maxLat: 41.80
    },
    borderPoints: [
      [-87.52, 41.76], // NW Lake Michigan
      [-84.80, 41.76], // NE Ohio border
      [-84.80, 39.10], // SE Cincinnati approach
      [-85.75, 38.25], // Louisville Ohio River
      [-87.58, 38.00], // Evansville
      [-88.00, 37.85], // Wabash River confluence
      [-87.52, 39.35], // Terre Haute IL line
      [-87.52, 41.76]
    ],
    districts: [
      { id: 'indot-grn', name: 'Greenfield District (Indianapolis Metro)', code: 'GRN', areaName: 'Central Indiana', officeCity: 'Greenfield', counties: ['Marion', 'Hamilton', 'Hancock'], highwayMiles: 2340, bridgeCount: 1250, color: '#3b82f6' },
      { id: 'indot-lap', name: 'LaPorte District (Gary / South Bend)', code: 'LAP', areaName: 'Northwest Indiana', officeCity: 'LaPorte', counties: ['Lake', 'Porter', 'LaPorte'], highwayMiles: 1980, bridgeCount: 980, color: '#ef4444' }
    ],
    keyCorridors: ['I-65', 'I-70', 'I-69', 'I-80', 'I-90', 'I-74', 'I-465'],
    majorCities: [
      { name: 'Indianapolis', coordinates: [-86.16, 39.77], isCapital: true },
      { name: 'Fort Wayne', coordinates: [-85.14, 41.08] },
      { name: 'Evansville', coordinates: [-87.57, 37.97] },
      { name: 'South Bend', coordinates: [-86.25, 41.68] },
      { name: 'Gary', coordinates: [-87.35, 41.59] }
    ]
  },

  OH: {
    code: 'OH',
    name: 'Ohio',
    agencyName: 'Ohio Department of Transportation',
    agencyAcronym: 'ODOT',
    websiteUrl: 'https://www.transportation.ohio.gov/programs/traffic-monitoring',
    portalName: 'ODOT Transportation Information Mapping System (TIMS)',
    bounds: {
      minLng: -84.85,
      maxLng: -80.50,
      minLat: 38.40,
      maxLat: 42.00
    },
    borderPoints: [
      [-84.80, 41.70],
      [-83.15, 41.70], // Lake Erie Toledo
      [-80.52, 42.00], // NE PA border
      [-80.52, 40.60],
      [-80.60, 39.80], // Ohio River Wheeling
      [-82.60, 38.50], // Portsmouth
      [-84.50, 39.10], // Cincinnati
      [-84.80, 39.10],
      [-84.80, 41.70]
    ],
    districts: [
      { id: 'ohdot-d6', name: 'District 6 (Columbus Metro)', code: 'D6', areaName: 'Central Ohio', officeCity: 'Delaware', counties: ['Franklin', 'Delaware', 'Union'], highwayMiles: 2410, bridgeCount: 1350, color: '#10b981' },
      { id: 'ohdot-d12', name: 'District 12 (Cleveland Metro)', code: 'D12', areaName: 'Cuyahoga, Lake, Geauga', officeCity: 'Cleveland', counties: ['Cuyahoga', 'Lake'], highwayMiles: 1950, bridgeCount: 1120, color: '#3b82f6' },
      { id: 'ohdot-d8', name: 'District 8 (Cincinnati Metro)', code: 'D8', areaName: 'Southwest Ohio', officeCity: 'Lebanon', counties: ['Hamilton', 'Butler', 'Warren'], highwayMiles: 2180, bridgeCount: 1080, color: '#f59e0b' }
    ],
    keyCorridors: ['I-70', 'I-71', 'I-75', 'I-80', 'I-90', 'I-77', 'I-270'],
    majorCities: [
      { name: 'Columbus', coordinates: [-83.00, 39.96], isCapital: true },
      { name: 'Cleveland', coordinates: [-81.69, 41.50] },
      { name: 'Cincinnati', coordinates: [-84.51, 39.10] },
      { name: 'Toledo', coordinates: [-83.56, 41.65] },
      { name: 'Akron', coordinates: [-81.52, 41.08] },
      { name: 'Dayton', coordinates: [-84.19, 39.76] }
    ]
  },

  CO: {
    code: 'CO',
    name: 'Colorado',
    agencyName: 'Colorado Department of Transportation',
    agencyAcronym: 'CDOT',
    websiteUrl: 'https://www.codot.gov/programs/planning/transportation-data/traffic-data',
    portalName: 'CDOT Online Transportation Information System (OTIS)',
    bounds: {
      minLng: -109.10,
      maxLng: -102.00,
      minLat: 36.95,
      maxLat: 41.05
    },
    borderPoints: [
      [-109.05, 41.00],
      [-102.05, 41.00],
      [-102.05, 37.00],
      [-109.05, 37.00],
      [-109.05, 41.00]
    ],
    districts: [
      { id: 'cdot-r1', name: 'Region 1 (Denver Metro)', code: 'R1', areaName: 'Denver, Adams, Arapahoe, Douglas, Jefferson', officeCity: 'Denver', counties: ['Denver', 'Adams', 'Arapahoe'], highwayMiles: 2150, bridgeCount: 1420, color: '#3b82f6' },
      { id: 'cdot-r2', name: 'Region 2 (Southeast / Colorado Springs)', code: 'R2', areaName: 'El Paso, Pueblo, Fremont', officeCity: 'Pueblo', counties: ['El Paso', 'Pueblo'], highwayMiles: 2350, bridgeCount: 890, color: '#f59e0b' },
      { id: 'cdot-r3', name: 'Region 3 (Northwest / Mountain Corridor)', code: 'R3', areaName: 'Eagle, Garfield, Mesa, Summit', officeCity: 'Grand Junction', counties: ['Mesa', 'Eagle', 'Summit'], highwayMiles: 2680, bridgeCount: 780, color: '#10b981' }
    ],
    keyCorridors: ['I-70', 'I-25', 'I-76', 'I-225', 'C-470', 'US-36', 'US-50', 'US-285'],
    majorCities: [
      { name: 'Denver', coordinates: [-104.99, 39.74], isCapital: true },
      { name: 'Colorado Springs', coordinates: [-104.82, 38.83] },
      { name: 'Fort Collins', coordinates: [-105.08, 40.59] },
      { name: 'Pueblo', coordinates: [-104.61, 38.25] },
      { name: 'Grand Junction', coordinates: [-108.55, 39.06] },
      { name: 'Boulder', coordinates: [-105.27, 40.01] }
    ]
  },

  MN: {
    code: 'MN',
    name: 'Minnesota',
    agencyName: 'Minnesota Department of Transportation',
    agencyAcronym: 'MnDOT',
    websiteUrl: 'https://www.dot.state.mn.us/traffic/data/',
    portalName: 'MnDOT Traffic Forecasting & Analysis / Traffic Data System',
    bounds: {
      minLng: -97.25,
      maxLng: -89.50,
      minLat: 43.50,
      maxLat: 49.40
    },
    borderPoints: [
      [-97.20, 49.00],
      [-95.15, 49.38], // Lake of the Woods NW Angle
      [-89.50, 48.00], // Grand Portage Lake Superior
      [-92.10, 46.75], // Duluth
      [-92.80, 45.00], // St. Croix river
      [-91.20, 43.50], // SE corner
      [-96.60, 43.50], // SW corner
      [-96.85, 46.00],
      [-97.20, 49.00]
    ],
    districts: [
      { id: 'mndot-met', name: 'Metro District (Twin Cities)', code: 'MET', areaName: 'Hennepin, Ramsey, Dakota, Anoka, Washington', officeCity: 'Roseville', counties: ['Hennepin', 'Ramsey', 'Dakota'], highwayMiles: 2480, bridgeCount: 1680, color: '#6366f1' },
      { id: 'mndot-d6', name: 'District 6 (Rochester / Southeast)', code: 'D6', areaName: 'Olmsted, Winona, Steele', officeCity: 'Rochester', counties: ['Olmsted', 'Winona'], highwayMiles: 1980, bridgeCount: 790, color: '#06b6d4' }
    ],
    keyCorridors: ['I-35', 'I-35W', 'I-35E', 'I-94', 'I-394', 'I-494', 'I-694', 'US-52'],
    majorCities: [
      { name: 'St. Paul', coordinates: [-93.09, 44.95], isCapital: true },
      { name: 'Minneapolis', coordinates: [-93.26, 44.98] },
      { name: 'Rochester', coordinates: [-92.48, 44.02] },
      { name: 'Duluth', coordinates: [-92.10, 46.78] },
      { name: 'Bloomington', coordinates: [-93.30, 44.84] }
    ]
  },

  WI: {
    code: 'WI',
    name: 'Wisconsin',
    agencyName: 'Wisconsin Department of Transportation',
    agencyAcronym: 'WisDOT',
    websiteUrl: 'https://wisconsindot.gov/pages/projects-plans/trans-planning/traffic-counts.aspx',
    portalName: 'WisDOT Interactive Traffic Counts & Volume Maps',
    bounds: {
      minLng: -92.90,
      maxLng: -86.75,
      minLat: 42.50,
      maxLat: 47.10
    },
    borderPoints: [
      [-92.10, 46.75], // Superior
      [-90.40, 47.00], // Lake Superior Apostle
      [-87.50, 45.10], // Green Bay
      [-87.00, 45.30], // Door County
      [-87.80, 42.50], // Kenosha IL line
      [-90.65, 42.50], // Mississippi river corner
      [-92.80, 45.00],
      [-92.10, 46.75]
    ],
    districts: [
      { id: 'wisdot-se', name: 'Southeast Region (Milwaukee Metro)', code: 'SE', areaName: 'Milwaukee, Waukesha, Racine, Kenosha', officeCity: 'Waukesha', counties: ['Milwaukee', 'Waukesha'], highwayMiles: 2150, bridgeCount: 1320, color: '#ef4444' },
      { id: 'wisdot-sw', name: 'Southwest Region (Madison - Capital)', code: 'SW', areaName: 'Dane, Rock, La Crosse', officeCity: 'Madison', counties: ['Dane', 'Rock'], highwayMiles: 2380, bridgeCount: 980, color: '#10b981' }
    ],
    keyCorridors: ['I-94', 'I-90', 'I-43', 'I-41', 'I-894', 'US-151', 'US-41'],
    majorCities: [
      { name: 'Madison', coordinates: [-89.40, 43.07], isCapital: true },
      { name: 'Milwaukee', coordinates: [-87.91, 43.04] },
      { name: 'Green Bay', coordinates: [-88.02, 44.51] },
      { name: 'Kenosha', coordinates: [-87.82, 42.58] },
      { name: 'La Crosse', coordinates: [-91.24, 43.80] }
    ]
  },

  MI: {
    code: 'MI',
    name: 'Michigan',
    agencyName: 'Michigan Department of Transportation',
    agencyAcronym: 'MDOT',
    websiteUrl: 'https://www.michigan.gov/mdot/travel/traffic-data',
    portalName: 'MDOT Traffic Volume Map System & Open Data',
    bounds: {
      minLng: -90.45,
      maxLng: -82.40,
      minLat: 41.70,
      maxLat: 48.30
    },
    borderPoints: [
      [-90.40, 46.50], // Upper Peninsula West
      [-84.40, 46.50], // Sault Ste. Marie
      [-82.40, 43.00], // Lake Huron Port Huron
      [-83.05, 42.33], // Detroit River
      [-83.45, 41.70], // Ohio line
      [-86.80, 41.76], // Indiana line
      [-86.50, 45.00], // Lake Michigan
      [-90.40, 46.50]
    ],
    districts: [
      { id: 'mdot-met', name: 'Metro Region (Detroit)', code: 'MET', areaName: 'Wayne, Oakland, Macomb', officeCity: 'Southfield', counties: ['Wayne', 'Oakland', 'Macomb'], highwayMiles: 2420, bridgeCount: 1540, color: '#3b82f6' },
      { id: 'mdot-uni', name: 'University Region (Lansing - Capital / Ann Arbor)', code: 'UNI', areaName: 'Ingham, Washtenaw, Jackson', officeCity: 'Jackson', counties: ['Ingham', 'Washtenaw'], highwayMiles: 2180, bridgeCount: 890, color: '#f59e0b' }
    ],
    keyCorridors: ['I-94', 'I-96', 'I-75', 'I-69', 'I-275', 'US-23', 'US-131'],
    majorCities: [
      { name: 'Lansing', coordinates: [-84.55, 42.73], isCapital: true },
      { name: 'Detroit', coordinates: [-83.05, 42.33] },
      { name: 'Grand Rapids', coordinates: [-85.67, 42.96] },
      { name: 'Ann Arbor', coordinates: [-83.74, 42.28] },
      { name: 'Flint', coordinates: [-83.69, 43.01] }
    ]
  },

  FL: {
    code: 'FL',
    name: 'Florida',
    agencyName: 'Florida Department of Transportation',
    agencyAcronym: 'FDOT',
    websiteUrl: 'https://www.fdot.gov/statistics/trafficdata',
    portalName: 'FDOT Florida Traffic Online (FTO) & Open Data Portal',
    bounds: {
      minLng: -87.65,
      maxLng: -80.00,
      minLat: 24.50,
      maxLat: 31.00
    },
    borderPoints: [
      [-87.60, 31.00], // Pensacola Alabama line
      [-82.00, 30.50], // Georgia line
      [-81.40, 30.70], // Jacksonville Atlantic
      [-80.10, 26.10], // Fort Lauderdale
      [-80.19, 25.76], // Miami
      [-81.80, 24.55], // Key West
      [-82.60, 27.80], // Tampa Bay
      [-84.30, 29.80], // Big Bend
      [-87.60, 30.30], // Gulf
      [-87.60, 31.00]
    ],
    districts: [
      { id: 'fdot-d4', name: 'District 4 (Fort Lauderdale / Palm Beach)', code: 'D4', areaName: 'Broward, Palm Beach', officeCity: 'Fort Lauderdale', counties: ['Broward', 'Palm Beach'], highwayMiles: 2380, bridgeCount: 1420, color: '#ef4444' },
      { id: 'fdot-d6', name: 'District 6 (Miami-Dade / Keys)', code: 'D6', areaName: 'Miami-Dade, Monroe', officeCity: 'Miami', counties: ['Miami-Dade', 'Monroe'], highwayMiles: 2150, bridgeCount: 1290, color: '#8b5cf6' },
      { id: 'fdot-d5', name: 'District 5 (Orlando Metro)', code: 'D5', areaName: 'Orange, Seminole, Osceola', officeCity: 'DeLand', counties: ['Orange', 'Seminole'], highwayMiles: 2650, bridgeCount: 1350, color: '#3b82f6' },
      { id: 'fdot-d7', name: 'District 7 (Tampa Bay)', code: 'D7', areaName: 'Hillsborough, Pinellas', officeCity: 'Tampa', counties: ['Hillsborough', 'Pinellas'], highwayMiles: 2280, bridgeCount: 1180, color: '#10b981' }
    ],
    keyCorridors: ['I-95', 'I-75', 'I-4', 'I-10', 'Florida\'s Turnpike', 'I-295', 'US-1'],
    majorCities: [
      { name: 'Tallahassee', coordinates: [-84.28, 30.44], isCapital: true },
      { name: 'Miami', coordinates: [-80.19, 25.76] },
      { name: 'Orlando', coordinates: [-81.38, 28.54] },
      { name: 'Tampa', coordinates: [-82.46, 27.95] },
      { name: 'Jacksonville', coordinates: [-81.66, 30.33] },
      { name: 'Fort Lauderdale', coordinates: [-80.14, 26.12] }
    ]
  },

  CA: {
    code: 'CA',
    name: 'California',
    agencyName: 'California Department of Transportation',
    agencyAcronym: 'Caltrans',
    websiteUrl: 'https://dot.ca.gov/programs/traffic-operations/census',
    portalName: 'Caltrans Traffic Census Program & PeMS Performance System',
    bounds: {
      minLng: -124.45,
      maxLng: -114.10,
      minLat: 32.50,
      maxLat: 42.00
    },
    borderPoints: [
      [-124.25, 42.00], // Crescent City OR line
      [-120.00, 42.00], // Modoc NE
      [-120.00, 39.00], // Lake Tahoe NV step
      [-114.60, 35.00], // Needles Colorado River
      [-114.60, 32.70], // Yuma AZ border
      [-117.15, 32.53], // San Diego Mexico border
      [-118.40, 34.00], // Los Angeles coast
      [-122.40, 37.80], // San Francisco Bay
      [-124.25, 40.50], // Cape Mendocino
      [-124.25, 42.00]
    ],
    districts: [
      { id: 'caltrans-d7', name: 'District 7 (Los Angeles & Ventura)', code: 'D7', areaName: 'Los Angeles, Ventura', officeCity: 'Los Angeles', counties: ['Los Angeles', 'Ventura'], highwayMiles: 2980, bridgeCount: 2450, color: '#ef4444' },
      { id: 'caltrans-d4', name: 'District 4 (San Francisco Bay Area)', code: 'D4', areaName: 'San Francisco, Alameda, Santa Clara, Contra Costa', officeCity: 'Oakland', counties: ['San Francisco', 'Alameda', 'Santa Clara'], highwayMiles: 2840, bridgeCount: 2100, color: '#3b82f6' },
      { id: 'caltrans-d3', name: 'District 3 (Sacramento - Capital)', code: 'D3', areaName: 'Sacramento, Placer, Yolo, El Dorado', officeCity: 'Marysville', counties: ['Sacramento', 'Placer'], highwayMiles: 2340, bridgeCount: 1350, color: '#10b981' },
      { id: 'caltrans-d11', name: 'District 11 (San Diego & Imperial)', code: 'D11', areaName: 'San Diego, Imperial', officeCity: 'San Diego', counties: ['San Diego', 'Imperial'], highwayMiles: 2150, bridgeCount: 1240, color: '#f59e0b' }
    ],
    keyCorridors: ['I-5', 'I-10', 'I-15', 'I-80', 'US-101', 'State Route 99', 'I-405', 'I-280', 'I-880'],
    majorCities: [
      { name: 'Sacramento', coordinates: [-121.49, 38.58], isCapital: true },
      { name: 'Los Angeles', coordinates: [-118.24, 34.05] },
      { name: 'San Francisco', coordinates: [-122.42, 37.77] },
      { name: 'San Diego', coordinates: [-117.16, 32.72] },
      { name: 'San Jose', coordinates: [-121.89, 37.34] },
      { name: 'Fresno', coordinates: [-119.79, 36.75] },
      { name: 'Oakland', coordinates: [-122.27, 37.80] }
    ]
  }
};

// Enriched STATE_CONFIGS with high-resolution cartographic state borders
export const STATE_CONFIGS: Record<string, StateConfig> = Object.fromEntries(
  Object.entries(BASE_STATE_CONFIGS).map(([code, config]) => [
    code,
    {
      ...config,
      borderPoints: DETAILED_STATE_BOUNDARIES[code]?.polygon || config.borderPoints
    }
  ])
);

// Multi-State Segments with Natural Topology Linkages
export const INITIAL_MULTI_STATE_SEGMENTS: TrafficSegment[] = [
  // --- Missouri I-70 Continuous Chain ---
  {
    ...TRAFFIC_SEGMENTS[0], // seg-i70-01 (St. Louis Downtown)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i70-02'],
    mileageLength: 3.2,
    corridorGroup: 'I-70 Trans-Missouri Mainline'
  },
  {
    ...TRAFFIC_SEGMENTS[1], // seg-i70-02 (Blanchette / St. Charles)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i70-01', 'seg-i70-03'],
    mileageLength: 2.6,
    corridorGroup: 'I-70 Trans-Missouri Mainline'
  },
  {
    ...TRAFFIC_SEGMENTS[2], // seg-i70-03 (Callaway / Kingdom City)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i70-02', 'seg-i70-04'],
    mileageLength: 3.5,
    corridorGroup: 'I-70 Trans-Missouri Mainline'
  },
  {
    ...TRAFFIC_SEGMENTS[3], // seg-i70-04 (Boone / Columbia)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i70-03', 'seg-i70-05'],
    mileageLength: 3.6,
    corridorGroup: 'I-70 Trans-Missouri Mainline'
  },
  {
    ...TRAFFIC_SEGMENTS[4], // seg-i70-05 (Jackson / Blue Springs)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i70-04', 'seg-i70-06'],
    mileageLength: 4.7,
    corridorGroup: 'I-70 Trans-Missouri Mainline'
  },
  {
    ...TRAFFIC_SEGMENTS[5], // seg-i70-06 (Jackson / KC Downtown)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i70-05', 'seg-ks-i70-01'],
    mileageLength: 2.7,
    corridorGroup: 'I-70 Trans-Missouri Mainline'
  },

  // --- Missouri I-44 Continuous Freight Chain ---
  {
    ...TRAFFIC_SEGMENTS[6], // seg-i44-01 (St. Louis Valley Park)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i44-02'],
    mileageLength: 3.5,
    corridorGroup: 'I-44 Ozark Freight Artery'
  },
  {
    ...TRAFFIC_SEGMENTS[7], // seg-i44-02 (Rolla Phelps)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i44-01', 'seg-i44-03'],
    mileageLength: 3.8,
    corridorGroup: 'I-44 Ozark Freight Artery'
  },
  {
    ...TRAFFIC_SEGMENTS[8], // seg-i44-03 (Springfield Greene)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i44-02', 'seg-i44-04'],
    mileageLength: 4.3,
    corridorGroup: 'I-44 Ozark Freight Artery'
  },
  {
    ...TRAFFIC_SEGMENTS[9], // seg-i44-04 (Joplin Jasper)
    stateCode: 'MO',
    connectedSegmentIds: ['seg-i44-03', 'seg-ok-i44-01'],
    mileageLength: 4.6,
    corridorGroup: 'I-44 Ozark Freight Artery'
  },

  // Remaining Missouri segments
  ...TRAFFIC_SEGMENTS.slice(10).map((s) => ({
    ...s,
    stateCode: 'MO',
    mileageLength: Math.max(Math.round((s.logmileEnd - s.logmileStart) * 10) / 10, 2.0),
    corridorGroup: `${s.route} Corridor`
  })),

  // --- Illinois (IDOT) Continuous I-55 Chain ---
  {
    id: 'seg-il-i55-01',
    stateCode: 'IL',
    route: 'I-55',
    routeType: 'Interstate',
    districtId: 'idot-d1',
    county: 'Cook',
    description: 'I-55 Stevenson Expressway downtown approach at I-90/I-94 Dan Ryan',
    logmileStart: 290.4,
    logmileEnd: 294.1,
    lanes: 8,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-il-i55-02'],
    mileageLength: 3.7,
    corridorGroup: 'I-55 Chicago-St. Louis Corridor',
    aadtCurrent: 174200,
    aadt2023: 171800,
    aadt2022: 168400,
    aadt2021: 161200,
    aadt2020: 139500,
    aadt2019: 179400,
    aadt2018: 177800,
    commercialAadt: 24800,
    commercialPercent: 14.2,
    singleUnitTrucks: 5600,
    combinationTrucks: 19200,
    kFactor: 0.089,
    dFactor: 0.54,
    peakHourVolume: 15503,
    centerPoint: [-87.65, 41.85],
    coordinates: [[-87.68, 41.83], [-87.65, 41.85], [-87.62, 41.86]]
  },
  {
    id: 'seg-il-i55-02',
    stateCode: 'IL',
    route: 'I-55',
    routeType: 'Interstate',
    districtId: 'idot-d6',
    county: 'Sangamon',
    description: 'I-55 Springfield bypass between Clear Lake Ave and I-72 Junction',
    logmileStart: 96.0,
    logmileEnd: 100.5,
    lanes: 6,
    speedLimit: 70,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-il-i55-01', 'seg-il-i55-03'],
    mileageLength: 4.5,
    corridorGroup: 'I-55 Chicago-St. Louis Corridor',
    aadtCurrent: 52400,
    aadt2023: 50900,
    aadt2022: 49400,
    aadt2021: 47100,
    aadt2020: 41200,
    aadt2019: 51800,
    aadt2018: 51100,
    commercialAadt: 14200,
    commercialPercent: 27.1,
    singleUnitTrucks: 2100,
    combinationTrucks: 12100,
    kFactor: 0.096,
    dFactor: 0.52,
    peakHourVolume: 5030,
    centerPoint: [-89.60, 39.80],
    coordinates: [[-89.62, 39.85], [-89.60, 39.80], [-89.58, 39.75]]
  },
  {
    id: 'seg-il-i55-03',
    stateCode: 'IL',
    route: 'I-55',
    routeType: 'Interstate',
    districtId: 'idot-d8',
    county: 'St. Clair',
    description: 'I-55/I-64/I-70 approach to Poplar Street Bridge into St. Louis',
    logmileStart: 0.5,
    logmileEnd: 3.8,
    lanes: 8,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-il-i55-02', 'seg-i70-01'],
    mileageLength: 3.3,
    corridorGroup: 'I-55 Chicago-St. Louis Corridor',
    aadtCurrent: 128400,
    aadt2023: 125600,
    aadt2022: 121900,
    aadt2021: 116200,
    aadt2020: 99400,
    aadt2019: 131800,
    aadt2018: 130200,
    commercialAadt: 21200,
    commercialPercent: 16.5,
    singleUnitTrucks: 4100,
    combinationTrucks: 17100,
    kFactor: 0.091,
    dFactor: 0.53,
    peakHourVolume: 11684,
    centerPoint: [-90.15, 38.62],
    coordinates: [[-90.12, 38.63], [-90.15, 38.62], [-90.17, 38.62]]
  },

  // --- Kansas (KDOT) Continuous I-70 Chain ---
  {
    id: 'seg-ks-i70-01',
    stateCode: 'KS',
    route: 'I-70',
    routeType: 'Interstate',
    districtId: 'kdot-d1',
    county: 'Wyandotte',
    description: 'I-70 Kansas Turnpike Lewis & Clark Viaduct into Downtown KC',
    logmileStart: 421.5,
    logmileEnd: 424.2,
    lanes: 6,
    speedLimit: 60,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-i70-06', 'seg-ks-i70-02'],
    mileageLength: 2.7,
    corridorGroup: 'I-70 Kansas Turnpike Corridor',
    aadtCurrent: 89400,
    aadt2023: 87200,
    aadt2022: 84600,
    aadt2021: 79800,
    aadt2020: 68400,
    aadt2019: 91200,
    aadt2018: 89900,
    commercialAadt: 12800,
    commercialPercent: 14.3,
    singleUnitTrucks: 2900,
    combinationTrucks: 9900,
    kFactor: 0.092,
    dFactor: 0.54,
    peakHourVolume: 8224,
    centerPoint: [-94.63, 39.10],
    coordinates: [[-94.67, 39.10], [-94.63, 39.10], [-94.61, 39.10]]
  },
  {
    id: 'seg-ks-i70-02',
    stateCode: 'KS',
    route: 'I-70',
    routeType: 'Interstate',
    districtId: 'kdot-d1',
    county: 'Shawnee',
    description: 'I-70 Topeka at Wanamaker Rd Interchange',
    logmileStart: 355.0,
    logmileEnd: 359.2,
    lanes: 6,
    speedLimit: 65,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-ks-i70-01'],
    mileageLength: 4.2,
    corridorGroup: 'I-70 Kansas Turnpike Corridor',
    aadtCurrent: 64200,
    aadt2023: 62500,
    aadt2022: 60800,
    aadt2021: 57400,
    aadt2020: 49800,
    aadt2019: 65100,
    aadt2018: 64200,
    commercialAadt: 10400,
    commercialPercent: 16.2,
    singleUnitTrucks: 1800,
    combinationTrucks: 8600,
    kFactor: 0.095,
    dFactor: 0.52,
    peakHourVolume: 6099,
    centerPoint: [-95.73, 39.05],
    coordinates: [[-95.78, 39.05], [-95.73, 39.05], [-95.67, 39.05]]
  },

  // --- Iowa (Iowa DOT) Segments ---
  {
    id: 'seg-ia-i80-01',
    stateCode: 'IA',
    route: 'I-80',
    routeType: 'Interstate',
    districtId: 'iadot-d1',
    county: 'Polk',
    description: 'I-80/I-35 Des Moines North Loop Mixmaster',
    logmileStart: 137.0,
    logmileEnd: 141.5,
    lanes: 8,
    speedLimit: 65,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-ia-i80-02'],
    mileageLength: 4.5,
    corridorGroup: 'I-80 Trans-Iowa Freight Corridor',
    aadtCurrent: 98600,
    aadt2023: 96100,
    aadt2022: 93400,
    aadt2021: 88500,
    aadt2020: 76200,
    aadt2019: 99400,
    aadt2018: 97800,
    commercialAadt: 26800,
    commercialPercent: 27.2,
    singleUnitTrucks: 3400,
    combinationTrucks: 23400,
    kFactor: 0.094,
    dFactor: 0.53,
    peakHourVolume: 9268,
    centerPoint: [-93.60, 41.65],
    coordinates: [[-93.68, 41.66], [-93.60, 41.65], [-93.52, 41.65]]
  },
  {
    id: 'seg-ia-i80-02',
    stateCode: 'IA',
    route: 'I-80',
    routeType: 'Interstate',
    districtId: 'iadot-d6',
    county: 'Scott',
    description: 'I-80 Davenport Mississippi River Bridge into Illinois',
    logmileStart: 304.5,
    logmileEnd: 308.2,
    lanes: 6,
    speedLimit: 65,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-ia-i80-01'],
    mileageLength: 3.7,
    corridorGroup: 'I-80 Trans-Iowa Freight Corridor',
    aadtCurrent: 44200,
    aadt2023: 42800,
    aadt2022: 41500,
    aadt2021: 39600,
    aadt2020: 34100,
    aadt2019: 44800,
    aadt2018: 43900,
    commercialAadt: 15100,
    commercialPercent: 34.2,
    singleUnitTrucks: 1800,
    combinationTrucks: 13300,
    kFactor: 0.098,
    dFactor: 0.51,
    peakHourVolume: 4331,
    centerPoint: [-90.45, 41.58],
    coordinates: [[-90.50, 41.58], [-90.45, 41.58], [-90.40, 41.57]]
  },

  // --- Arkansas (ARDOT) Segments ---
  {
    id: 'seg-ar-i40-01',
    stateCode: 'AR',
    route: 'I-40',
    routeType: 'Interstate',
    districtId: 'ardot-d6',
    county: 'Pulaski',
    description: 'I-40 North Little Rock at I-30 Interchange',
    logmileStart: 153.2,
    logmileEnd: 157.0,
    lanes: 8,
    speedLimit: 65,
    functionalClass: 'Interstate',
    mileageLength: 3.8,
    corridorGroup: 'I-40 Cross-Arkansas Logistics Artery',
    aadtCurrent: 116800,
    aadt2023: 114200,
    aadt2022: 110900,
    aadt2021: 105400,
    aadt2020: 91800,
    aadt2019: 118400,
    aadt2018: 116900,
    commercialAadt: 33400,
    commercialPercent: 28.6,
    singleUnitTrucks: 4100,
    combinationTrucks: 29300,
    kFactor: 0.091,
    dFactor: 0.52,
    peakHourVolume: 10628,
    centerPoint: [-92.26, 34.77],
    coordinates: [[-92.32, 34.78], [-92.26, 34.77], [-92.20, 34.76]]
  },

  // --- Tennessee (TDOT) Segments ---
  {
    id: 'seg-tn-i40-01',
    stateCode: 'TN',
    route: 'I-40',
    routeType: 'Interstate',
    districtId: 'tdot-r3',
    county: 'Davidson',
    description: 'I-40 Nashville Central Corridor at I-65 Junction',
    logmileStart: 208.5,
    logmileEnd: 212.0,
    lanes: 8,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-tn-i40-02'],
    mileageLength: 3.5,
    corridorGroup: 'I-40 Music City Freight Artery',
    aadtCurrent: 168400,
    aadt2023: 164900,
    aadt2022: 159800,
    aadt2021: 151200,
    aadt2020: 131800,
    aadt2019: 171500,
    aadt2018: 169800,
    commercialAadt: 25400,
    commercialPercent: 15.1,
    singleUnitTrucks: 5800,
    combinationTrucks: 19600,
    kFactor: 0.088,
    dFactor: 0.55,
    peakHourVolume: 14819,
    centerPoint: [-86.78, 36.15],
    coordinates: [[-86.83, 36.15], [-86.78, 36.15], [-86.73, 36.15]]
  },
  {
    id: 'seg-tn-i40-02',
    stateCode: 'TN',
    route: 'I-40',
    routeType: 'Interstate',
    districtId: 'tdot-r4',
    county: 'Shelby',
    description: 'I-40 Hernando de Soto Bridge crossing Mississippi River into Memphis',
    logmileStart: 0.0,
    logmileEnd: 2.8,
    lanes: 6,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-tn-i40-01'],
    mileageLength: 2.8,
    corridorGroup: 'I-40 Music City Freight Artery',
    aadtCurrent: 61400,
    aadt2023: 59800,
    aadt2022: 58100,
    aadt2021: 54900,
    aadt2020: 48200,
    aadt2019: 62500,
    aadt2018: 61800,
    commercialAadt: 18200,
    commercialPercent: 29.6,
    singleUnitTrucks: 2400,
    combinationTrucks: 15800,
    kFactor: 0.093,
    dFactor: 0.52,
    peakHourVolume: 5710,
    centerPoint: [-90.06, 35.15],
    coordinates: [[-90.08, 35.15], [-90.06, 35.15], [-90.03, 35.15]]
  },

  // --- Kentucky (KYTC) Segments ---
  {
    id: 'seg-ky-i65-01',
    stateCode: 'KY',
    route: 'I-65',
    routeType: 'Interstate',
    districtId: 'kytc-d5',
    county: 'Jefferson',
    description: 'I-65 Abraham Lincoln Bridge entering Louisville from Indiana',
    logmileStart: 136.0,
    logmileEnd: 139.2,
    lanes: 6,
    speedLimit: 55,
    functionalClass: 'Interstate',
    mileageLength: 3.2,
    corridorGroup: 'I-65 Ohio Valley Logistics Spine',
    aadtCurrent: 134200,
    aadt2023: 131800,
    aadt2022: 128400,
    aadt2021: 122100,
    aadt2020: 104500,
    aadt2019: 136800,
    aadt2018: 135100,
    commercialAadt: 21800,
    commercialPercent: 16.2,
    singleUnitTrucks: 4300,
    combinationTrucks: 17500,
    kFactor: 0.092,
    dFactor: 0.54,
    peakHourVolume: 12346,
    centerPoint: [-85.75, 38.26],
    coordinates: [[-85.75, 38.28], [-85.75, 38.26], [-85.75, 38.23]]
  },

  // --- Nebraska (NDOT) Segments ---
  {
    id: 'seg-ne-i80-01',
    stateCode: 'NE',
    route: 'I-80',
    routeType: 'Interstate',
    districtId: 'ndot-d2',
    county: 'Douglas',
    description: 'I-80 Omaha Central Corridor at 72nd Street Interchange',
    logmileStart: 448.0,
    logmileEnd: 452.4,
    lanes: 8,
    speedLimit: 65,
    functionalClass: 'Interstate',
    mileageLength: 4.4,
    corridorGroup: 'I-80 Trans-Nebraska Gateway',
    aadtCurrent: 148900,
    aadt2023: 145800,
    aadt2022: 141900,
    aadt2021: 134200,
    aadt2020: 116800,
    aadt2019: 151200,
    aadt2018: 149400,
    commercialAadt: 22400,
    commercialPercent: 15.0,
    singleUnitTrucks: 4800,
    combinationTrucks: 17600,
    kFactor: 0.091,
    dFactor: 0.55,
    peakHourVolume: 13549,
    centerPoint: [-96.02, 41.22],
    coordinates: [[-96.08, 41.22], [-96.02, 41.22], [-95.96, 41.22]]
  },

  // --- Oklahoma (ODOT) Segments ---
  {
    id: 'seg-ok-i44-01',
    stateCode: 'OK',
    route: 'I-44',
    routeType: 'Interstate',
    districtId: 'odot-d8',
    county: 'Ottawa',
    description: 'I-44 Will Rogers Turnpike entering Oklahoma from Missouri (Joplin border)',
    logmileStart: 326.0,
    logmileEnd: 329.8,
    lanes: 4,
    speedLimit: 75,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-i44-04'],
    mileageLength: 3.8,
    corridorGroup: 'I-44 Will Rogers Turnpike',
    aadtCurrent: 32400,
    aadt2023: 31200,
    aadt2022: 30100,
    aadt2021: 28800,
    aadt2020: 24900,
    aadt2019: 31800,
    aadt2018: 31200,
    commercialAadt: 12800,
    commercialPercent: 39.5,
    singleUnitTrucks: 1400,
    combinationTrucks: 11400,
    kFactor: 0.104,
    dFactor: 0.51,
    peakHourVolume: 3369,
    centerPoint: [-94.63, 36.98],
    coordinates: [[-94.68, 36.95], [-94.63, 36.98], [-94.60, 37.00]]
  },

  // --- Texas (TxDOT) Segments ---
  {
    id: 'seg-tx-i35-01',
    stateCode: 'TX',
    route: 'I-35',
    routeType: 'Interstate',
    districtId: 'txdot-aus',
    county: 'Travis',
    description: 'I-35 Central Austin Downtown Corridor between MLK Jr Blvd and Lady Bird Lake',
    logmileStart: 235.0,
    logmileEnd: 238.5,
    lanes: 8,
    speedLimit: 60,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-tx-i35-02'],
    mileageLength: 3.5,
    corridorGroup: 'I-35 Central Texas NAFTA Spine',
    aadtCurrent: 214500,
    aadt2023: 209800,
    aadt2022: 203400,
    aadt2021: 191200,
    aadt2020: 165400,
    aadt2019: 218600,
    aadt2018: 215400,
    commercialAadt: 24200,
    commercialPercent: 11.3,
    singleUnitTrucks: 5800,
    combinationTrucks: 18400,
    kFactor: 0.088,
    dFactor: 0.53,
    peakHourVolume: 18876,
    centerPoint: [-97.73, 30.27],
    coordinates: [[-97.74, 30.30], [-97.73, 30.27], [-97.73, 30.24]]
  },
  {
    id: 'seg-tx-i35-02',
    stateCode: 'TX',
    route: 'I-35E',
    routeType: 'Interstate',
    districtId: 'txdot-dal',
    county: 'Dallas',
    description: 'I-35E Stemmons Freeway at I-30 Mixmaster Downtown Dallas',
    logmileStart: 427.0,
    logmileEnd: 431.2,
    lanes: 10,
    speedLimit: 65,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-tx-i35-01'],
    mileageLength: 4.2,
    corridorGroup: 'I-35 Central Texas NAFTA Spine',
    aadtCurrent: 248200,
    aadt2023: 242500,
    aadt2022: 235100,
    aadt2021: 221000,
    aadt2020: 189400,
    aadt2019: 252100,
    aadt2018: 247800,
    commercialAadt: 29800,
    commercialPercent: 12.0,
    singleUnitTrucks: 6900,
    combinationTrucks: 22900,
    kFactor: 0.086,
    dFactor: 0.54,
    peakHourVolume: 21345,
    centerPoint: [-96.81, 32.78],
    coordinates: [[-96.83, 32.81], [-96.81, 32.78], [-96.80, 32.75]]
  },
  {
    id: 'seg-tx-i10-01',
    stateCode: 'TX',
    route: 'I-10',
    routeType: 'Interstate',
    districtId: 'txdot-hou',
    county: 'Harris',
    description: 'I-10 Katy Freeway at Beltway 8 West Houston Energy Corridor',
    logmileStart: 752.0,
    logmileEnd: 756.8,
    lanes: 12,
    speedLimit: 65,
    functionalClass: 'Interstate',
    mileageLength: 4.8,
    corridorGroup: 'I-10 Gulf Transcontinental Corridor',
    aadtCurrent: 312400,
    aadt2023: 306200,
    aadt2022: 298100,
    aadt2021: 281400,
    aadt2020: 241000,
    aadt2019: 318500,
    aadt2018: 314200,
    commercialAadt: 35600,
    commercialPercent: 11.4,
    singleUnitTrucks: 7800,
    combinationTrucks: 27800,
    kFactor: 0.084,
    dFactor: 0.55,
    peakHourVolume: 26241,
    centerPoint: [-95.56, 29.78],
    coordinates: [[-95.62, 29.78], [-95.56, 29.78], [-95.49, 29.78]]
  },

  // --- Indiana (INDOT) Segments ---
  {
    id: 'seg-in-i65-01',
    stateCode: 'IN',
    route: 'I-65',
    routeType: 'Interstate',
    districtId: 'indot-grn',
    county: 'Marion',
    description: 'I-65/I-70 South Split Downtown Indianapolis',
    logmileStart: 110.5,
    logmileEnd: 114.2,
    lanes: 8,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-in-i70-01'],
    mileageLength: 3.7,
    corridorGroup: 'Crossroads of America Spine',
    aadtCurrent: 152400,
    aadt2023: 148900,
    aadt2022: 144500,
    aadt2021: 137800,
    aadt2020: 119500,
    aadt2019: 154800,
    aadt2018: 153200,
    commercialAadt: 28400,
    commercialPercent: 18.6,
    singleUnitTrucks: 5600,
    combinationTrucks: 22800,
    kFactor: 0.091,
    dFactor: 0.53,
    peakHourVolume: 13868,
    centerPoint: [-86.15, 39.76],
    coordinates: [[-86.17, 39.79], [-86.15, 39.76], [-86.14, 39.73]]
  },
  {
    id: 'seg-in-i70-01',
    stateCode: 'IN',
    route: 'I-70',
    routeType: 'Interstate',
    districtId: 'indot-grn',
    county: 'Marion',
    description: 'I-70 East between I-465 and Downtown Indianapolis',
    logmileStart: 85.0,
    logmileEnd: 89.2,
    lanes: 8,
    speedLimit: 65,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-in-i65-01'],
    mileageLength: 4.2,
    corridorGroup: 'Crossroads of America Spine',
    aadtCurrent: 138600,
    aadt2023: 135200,
    aadt2022: 131800,
    aadt2021: 125400,
    aadt2020: 108900,
    aadt2019: 140800,
    aadt2018: 139200,
    commercialAadt: 29800,
    commercialPercent: 21.5,
    singleUnitTrucks: 5100,
    combinationTrucks: 24700,
    kFactor: 0.092,
    dFactor: 0.54,
    peakHourVolume: 12751,
    centerPoint: [-86.10, 39.78],
    coordinates: [[-86.15, 39.76], [-86.10, 39.78], [-86.04, 39.79]]
  },

  // --- Ohio (ODOT) Segments ---
  {
    id: 'seg-oh-i70-01',
    stateCode: 'OH',
    route: 'I-70',
    routeType: 'Interstate',
    districtId: 'ohdot-d6',
    county: 'Franklin',
    description: 'I-70 Downtown Columbus Split at I-71 Junction',
    logmileStart: 99.0,
    logmileEnd: 102.8,
    lanes: 8,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-oh-i71-01'],
    mileageLength: 3.8,
    corridorGroup: 'I-70 Trans-Ohio Corridor',
    aadtCurrent: 162400,
    aadt2023: 158900,
    aadt2022: 154200,
    aadt2021: 147100,
    aadt2020: 128500,
    aadt2019: 165100,
    aadt2018: 163800,
    commercialAadt: 27400,
    commercialPercent: 16.9,
    singleUnitTrucks: 5800,
    combinationTrucks: 21600,
    kFactor: 0.089,
    dFactor: 0.54,
    peakHourVolume: 14453,
    centerPoint: [-83.00, 39.95],
    coordinates: [[-83.04, 39.95], [-83.00, 39.95], [-82.95, 39.95]]
  },
  {
    id: 'seg-oh-i71-01',
    stateCode: 'OH',
    route: 'I-71',
    routeType: 'Interstate',
    districtId: 'ohdot-d12',
    county: 'Cuyahoga',
    description: 'I-71 Cleveland Innerbelt approach to I-90 Junction',
    logmileStart: 244.0,
    logmileEnd: 247.5,
    lanes: 8,
    speedLimit: 60,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-oh-i70-01'],
    mileageLength: 3.5,
    corridorGroup: 'I-71 Ohio Metro Spine',
    aadtCurrent: 144200,
    aadt2023: 141000,
    aadt2022: 137400,
    aadt2021: 130800,
    aadt2020: 114200,
    aadt2019: 146800,
    aadt2018: 145200,
    commercialAadt: 18200,
    commercialPercent: 12.6,
    singleUnitTrucks: 4100,
    combinationTrucks: 14100,
    kFactor: 0.091,
    dFactor: 0.53,
    peakHourVolume: 13122,
    centerPoint: [-81.71, 41.48],
    coordinates: [[-81.74, 41.45], [-81.71, 41.48], [-81.68, 41.50]]
  },

  // --- Colorado (CDOT) Segments ---
  {
    id: 'seg-co-i70-01',
    stateCode: 'CO',
    route: 'I-70',
    routeType: 'Interstate',
    districtId: 'cdot-r1',
    county: 'Denver',
    description: 'Central 70 Project Corridor between I-25 and Colorado Blvd',
    logmileStart: 274.0,
    logmileEnd: 278.2,
    lanes: 10,
    speedLimit: 60,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-co-i70-02'],
    mileageLength: 4.2,
    corridorGroup: 'I-70 Rocky Mountain Gateway',
    aadtCurrent: 176500,
    aadt2023: 172800,
    aadt2022: 167500,
    aadt2021: 158900,
    aadt2020: 138400,
    aadt2019: 179200,
    aadt2018: 177400,
    commercialAadt: 21800,
    commercialPercent: 12.4,
    singleUnitTrucks: 4800,
    combinationTrucks: 17000,
    kFactor: 0.089,
    dFactor: 0.54,
    peakHourVolume: 15708,
    centerPoint: [-104.97, 39.78],
    coordinates: [[-105.01, 39.78], [-104.97, 39.78], [-104.92, 39.78]]
  },
  {
    id: 'seg-co-i70-02',
    stateCode: 'CO',
    route: 'I-70',
    routeType: 'Interstate',
    districtId: 'cdot-r3',
    county: 'Summit',
    description: 'I-70 Mountain Corridor at Eisenhower-Johnson Memorial Tunnel (Continental Divide)',
    logmileStart: 213.0,
    logmileEnd: 216.5,
    lanes: 4,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-co-i70-01'],
    mileageLength: 3.5,
    corridorGroup: 'I-70 Rocky Mountain Gateway',
    aadtCurrent: 42800,
    aadt2023: 41900,
    aadt2022: 40800,
    aadt2021: 38700,
    aadt2020: 33400,
    aadt2019: 43200,
    aadt2018: 42500,
    commercialAadt: 5200,
    commercialPercent: 12.1,
    singleUnitTrucks: 1200,
    combinationTrucks: 4000,
    kFactor: 0.125,
    dFactor: 0.58,
    peakHourVolume: 5350,
    centerPoint: [-105.92, 39.68],
    coordinates: [[-105.96, 39.69], [-105.92, 39.68], [-105.88, 39.68]]
  },

  // --- Minnesota (MnDOT) Segments ---
  {
    id: 'seg-mn-i35w-01',
    stateCode: 'MN',
    route: 'I-35W',
    routeType: 'Interstate',
    districtId: 'mndot-met',
    county: 'Hennepin',
    description: 'I-35W St. Anthony Falls Bridge crossing Mississippi River into Minneapolis',
    logmileStart: 17.5,
    logmileEnd: 20.8,
    lanes: 10,
    speedLimit: 55,
    functionalClass: 'Interstate',
    mileageLength: 3.3,
    corridorGroup: 'Twin Cities High-Volume Network',
    aadtCurrent: 148500,
    aadt2023: 145100,
    aadt2022: 140800,
    aadt2021: 133400,
    aadt2020: 114800,
    aadt2019: 151200,
    aadt2018: 149600,
    commercialAadt: 16200,
    commercialPercent: 10.9,
    singleUnitTrucks: 3900,
    combinationTrucks: 12300,
    kFactor: 0.089,
    dFactor: 0.53,
    peakHourVolume: 13216,
    centerPoint: [-93.24, 44.98],
    coordinates: [[-93.26, 44.96], [-93.24, 44.98], [-93.23, 45.01]]
  },

  // --- Wisconsin (WisDOT) Segments ---
  {
    id: 'seg-wi-i94-01',
    stateCode: 'WI',
    route: 'I-94',
    routeType: 'Interstate',
    districtId: 'wisdot-se',
    county: 'Milwaukee',
    description: 'I-94 East-West Corridor at Marquette Interchange Downtown Milwaukee',
    logmileStart: 310.0,
    logmileEnd: 313.8,
    lanes: 8,
    speedLimit: 55,
    functionalClass: 'Interstate',
    mileageLength: 3.8,
    corridorGroup: 'I-94 Lake Michigan Corridor',
    aadtCurrent: 164200,
    aadt2023: 160800,
    aadt2022: 156100,
    aadt2021: 148200,
    aadt2020: 127900,
    aadt2019: 167500,
    aadt2018: 165800,
    commercialAadt: 19800,
    commercialPercent: 12.1,
    singleUnitTrucks: 4600,
    combinationTrucks: 15200,
    kFactor: 0.088,
    dFactor: 0.54,
    peakHourVolume: 14449,
    centerPoint: [-87.92, 43.03],
    coordinates: [[-87.96, 43.03], [-87.92, 43.03], [-87.89, 43.03]]
  },

  // --- Michigan (MDOT) Segments ---
  {
    id: 'seg-mi-i94-01',
    stateCode: 'MI',
    route: 'I-94',
    routeType: 'Interstate',
    districtId: 'mdot-met',
    county: 'Wayne',
    description: 'I-94 Edsel Ford Freeway at I-75 Junction in Central Detroit',
    logmileStart: 214.0,
    logmileEnd: 217.6,
    lanes: 8,
    speedLimit: 55,
    functionalClass: 'Interstate',
    mileageLength: 3.6,
    corridorGroup: 'I-94 Great Lakes Auto Corridor',
    aadtCurrent: 158200,
    aadt2023: 154800,
    aadt2022: 150200,
    aadt2021: 142600,
    aadt2020: 122800,
    aadt2019: 161400,
    aadt2018: 159800,
    commercialAadt: 23400,
    commercialPercent: 14.8,
    singleUnitTrucks: 5200,
    combinationTrucks: 18200,
    kFactor: 0.090,
    dFactor: 0.53,
    peakHourVolume: 14238,
    centerPoint: [-83.06, 42.36],
    coordinates: [[-83.10, 42.35], [-83.06, 42.36], [-83.02, 42.37]]
  },

  // --- Florida (FDOT) Segments ---
  {
    id: 'seg-fl-i95-01',
    stateCode: 'FL',
    route: 'I-95',
    routeType: 'Interstate',
    districtId: 'fdot-d6',
    county: 'Miami-Dade',
    description: 'I-95 Express Midtown Miami at I-195 / Julia Tuttle Cswy Interchange',
    logmileStart: 4.0,
    logmileEnd: 7.8,
    lanes: 10,
    speedLimit: 60,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-fl-i4-01'],
    mileageLength: 3.8,
    corridorGroup: 'I-95 Atlantic Coast Spine',
    aadtCurrent: 265400,
    aadt2023: 259800,
    aadt2022: 252100,
    aadt2021: 238900,
    aadt2020: 204500,
    aadt2019: 271200,
    aadt2018: 267800,
    commercialAadt: 21200,
    commercialPercent: 8.0,
    singleUnitTrucks: 6400,
    combinationTrucks: 14800,
    kFactor: 0.082,
    dFactor: 0.55,
    peakHourVolume: 21762,
    centerPoint: [-80.20, 25.81],
    coordinates: [[-80.20, 25.78], [-80.20, 25.81], [-80.20, 25.85]]
  },
  {
    id: 'seg-fl-i4-01',
    stateCode: 'FL',
    route: 'I-4',
    routeType: 'Interstate',
    districtId: 'fdot-d5',
    county: 'Orange',
    description: 'I-4 Ultimate Downtown Orlando Corridor at SR 408 East-West Expressway',
    logmileStart: 81.5,
    logmileEnd: 85.5,
    lanes: 10,
    speedLimit: 60,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-fl-i95-01'],
    mileageLength: 4.0,
    corridorGroup: 'I-4 Central Florida Expressway',
    aadtCurrent: 192800,
    aadt2023: 188400,
    aadt2022: 182900,
    aadt2021: 172400,
    aadt2020: 146800,
    aadt2019: 196500,
    aadt2018: 193800,
    commercialAadt: 18400,
    commercialPercent: 9.5,
    singleUnitTrucks: 4800,
    combinationTrucks: 13600,
    kFactor: 0.085,
    dFactor: 0.54,
    peakHourVolume: 16388,
    centerPoint: [-81.38, 28.54],
    coordinates: [[-81.40, 28.52], [-81.38, 28.54], [-81.36, 28.56]]
  },

  // --- California (Caltrans) Segments ---
  {
    id: 'seg-ca-i5-01',
    stateCode: 'CA',
    route: 'I-5',
    routeType: 'Interstate',
    districtId: 'caltrans-d7',
    county: 'Los Angeles',
    description: 'I-5 Santa Ana Freeway at East LA Interchange (I-10 / US-101 / SR-60)',
    logmileStart: 133.0,
    logmileEnd: 136.8,
    lanes: 10,
    speedLimit: 55,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-ca-i5-02'],
    mileageLength: 3.8,
    corridorGroup: 'I-5 Pacific Golden Corridor',
    aadtCurrent: 278600,
    aadt2023: 272400,
    aadt2022: 264800,
    aadt2021: 249800,
    aadt2020: 215400,
    aadt2019: 284500,
    aadt2018: 281200,
    commercialAadt: 31200,
    commercialPercent: 11.2,
    singleUnitTrucks: 7400,
    combinationTrucks: 23800,
    kFactor: 0.081,
    dFactor: 0.54,
    peakHourVolume: 22566,
    centerPoint: [-118.21, 34.02],
    coordinates: [[-118.23, 34.04], [-118.21, 34.02], [-118.18, 33.99]]
  },
  {
    id: 'seg-ca-i5-02',
    stateCode: 'CA',
    route: 'I-5',
    routeType: 'Interstate',
    districtId: 'caltrans-d3',
    county: 'Sacramento',
    description: 'I-5 Sacramento Riverfront Corridor near State Capitol at Tower Bridge',
    logmileStart: 518.0,
    logmileEnd: 521.8,
    lanes: 8,
    speedLimit: 65,
    functionalClass: 'Interstate',
    connectedSegmentIds: ['seg-ca-i5-01'],
    mileageLength: 3.8,
    corridorGroup: 'I-5 Pacific Golden Corridor',
    aadtCurrent: 182400,
    aadt2023: 178200,
    aadt2022: 172900,
    aadt2021: 163400,
    aadt2020: 141200,
    aadt2019: 186400,
    aadt2018: 184100,
    commercialAadt: 22400,
    commercialPercent: 12.3,
    singleUnitTrucks: 4900,
    combinationTrucks: 17500,
    kFactor: 0.088,
    dFactor: 0.53,
    peakHourVolume: 16051,
    centerPoint: [-121.51, 38.58],
    coordinates: [[-121.51, 38.55], [-121.51, 38.58], [-121.51, 38.61]]
  }
];

// Continuous Count Stations for multiple states
export const INITIAL_MULTI_STATE_STATIONS: ContinuousCountStation[] = [
  ...CONTINUOUS_COUNT_STATIONS.map((sta) => ({ ...sta, stateCode: 'MO' })),
  {
    id: 'ccs-il-055-01',
    stateCode: 'IL',
    stationNumber: 'IDOT ATR #602 (Springfield I-55)',
    route: 'I-55',
    county: 'Sangamon',
    districtId: 'idot-d6',
    locationDescription: 'I-55, 1.2 miles North of Stevenson Drive at Milepost 93.8',
    milepost: 93.8,
    stationType: 'WIM (Weigh-in-Motion)',
    directionMonitored: 'Both',
    annualAverageDailyTraffic: 52400,
    commercialVehiclesDaily: 14200,
    commercialPercentage: 27.1,
    peakHour: '16:30 - 17:30',
    peakHourVolume: 5030,
    coordinates: [-89.60, 39.77],
    hourlyProfile: CONTINUOUS_COUNT_STATIONS[0].hourlyProfile.map(h => ({
      hour: h.hour,
      volume: Math.round(h.volume * 1.18),
      truckVolume: Math.round(h.truckVolume * 1.06)
    })),
    dayOfWeekFactor: CONTINUOUS_COUNT_STATIONS[0].dayOfWeekFactor,
    monthlyFactor: CONTINUOUS_COUNT_STATIONS[0].monthlyFactor.map(m => ({
      month: m.month,
      aadt: Math.round(m.aadt * 1.18)
    })),
    vehicleClasses: CONTINUOUS_COUNT_STATIONS[0].vehicleClasses
  },
  {
    id: 'ccs-ks-070-01',
    stateCode: 'KS',
    stationNumber: 'KDOT ATR #032 (Topeka I-70)',
    route: 'I-70',
    county: 'Shawnee',
    districtId: 'kdot-d1',
    locationDescription: 'I-70 Kansas Turnpike Milepost 356.5',
    milepost: 356.5,
    stationType: 'ATR (Automatic Traffic Recorder)',
    directionMonitored: 'Both',
    annualAverageDailyTraffic: 64200,
    commercialVehiclesDaily: 10400,
    commercialPercentage: 16.2,
    peakHour: '17:00 - 18:00',
    peakHourVolume: 6099,
    coordinates: [-95.73, 39.05],
    hourlyProfile: CONTINUOUS_COUNT_STATIONS[0].hourlyProfile.map(h => ({
      hour: h.hour,
      volume: Math.round(h.volume * 1.45),
      truckVolume: Math.round(h.truckVolume * 0.78)
    })),
    dayOfWeekFactor: CONTINUOUS_COUNT_STATIONS[0].dayOfWeekFactor,
    monthlyFactor: CONTINUOUS_COUNT_STATIONS[0].monthlyFactor.map(m => ({
      month: m.month,
      aadt: Math.round(m.aadt * 1.45)
    })),
    vehicleClasses: CONTINUOUS_COUNT_STATIONS[0].vehicleClasses
  },
  {
    id: 'ccs-ia-080-01',
    stateCode: 'IA',
    stationNumber: 'Iowa DOT ATR #112 (Des Moines I-80)',
    route: 'I-80',
    county: 'Polk',
    districtId: 'iadot-d1',
    locationDescription: 'I-80 Milepost 139.4 at 2nd Avenue Interchange',
    milepost: 139.4,
    stationType: 'WIM (Weigh-in-Motion)',
    directionMonitored: 'Both',
    annualAverageDailyTraffic: 98600,
    commercialVehiclesDaily: 26800,
    commercialPercentage: 27.2,
    peakHour: '17:00 - 18:00',
    peakHourVolume: 9268,
    coordinates: [-93.60, 41.65],
    hourlyProfile: CONTINUOUS_COUNT_STATIONS[0].hourlyProfile.map(h => ({
      hour: h.hour,
      volume: Math.round(h.volume * 2.2),
      truckVolume: Math.round(h.truckVolume * 2.0)
    })),
    dayOfWeekFactor: CONTINUOUS_COUNT_STATIONS[0].dayOfWeekFactor,
    monthlyFactor: CONTINUOUS_COUNT_STATIONS[0].monthlyFactor,
    vehicleClasses: CONTINUOUS_COUNT_STATIONS[0].vehicleClasses
  },
  {
    id: 'ccs-tn-040-01',
    stateCode: 'TN',
    stationNumber: 'TDOT TN-TIMES ATR #401 (Nashville I-40)',
    route: 'I-40',
    county: 'Davidson',
    districtId: 'tdot-r3',
    locationDescription: 'I-40 at Milepost 209.8 near Nashville Airport / Briley Pkwy',
    milepost: 209.8,
    stationType: 'ATR (Automatic Traffic Recorder)',
    directionMonitored: 'Both',
    annualAverageDailyTraffic: 168400,
    commercialVehiclesDaily: 25400,
    commercialPercentage: 15.1,
    peakHour: '07:30 - 08:30',
    peakHourVolume: 14819,
    coordinates: [-86.78, 36.15],
    hourlyProfile: CONTINUOUS_COUNT_STATIONS[2].hourlyProfile.map(h => ({
      hour: h.hour,
      volume: Math.round(h.volume * 1.06),
      truckVolume: Math.round(h.truckVolume * 1.5)
    })),
    dayOfWeekFactor: CONTINUOUS_COUNT_STATIONS[2].dayOfWeekFactor,
    monthlyFactor: CONTINUOUS_COUNT_STATIONS[2].monthlyFactor,
    vehicleClasses: CONTINUOUS_COUNT_STATIONS[2].vehicleClasses
  }
];

// Multi-State Map Documents Catalog
export const INITIAL_MULTI_STATE_DOCUMENTS: MoDOTMapDocument[] = [
  ...MODOT_MAP_DOCUMENTS.map((doc) => ({
    ...doc,
    stateCode: 'MO',
    agencyAcronym: 'MoDOT'
  })),

  // Illinois (IDOT)
  {
    id: 'doc-il-2024-statewide',
    stateCode: 'IL',
    agencyAcronym: 'IDOT',
    title: '2024 Illinois Official Statewide Traffic Flow Map',
    year: 2024,
    category: 'Statewide Map',
    format: 'GeoPDF',
    fileSizeMb: 21.2,
    fileSizeBytes: 22229811,
    sha256Hash: 'f412837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://idot.illinois.gov/content/dam/soi/en/web/idot/documents/transportation-system/maps/traffic-counts/2024_Statewide_Traffic_Counts.pdf',
    description: 'State of Illinois official Annual Average Daily Traffic (AADT) flow map with interstate and state marked routes.',
    coverageArea: 'State of Illinois (102 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 16400
  },
  {
    id: 'doc-il-2024-chicago',
    stateCode: 'IL',
    agencyAcronym: 'IDOT',
    title: '2024 Chicago Regional Expressways Traffic Volume Map',
    year: 2024,
    category: 'Urban Area Inset',
    districtId: 'idot-d1',
    districtName: 'District 1 (Chicago Metro)',
    format: 'PDF',
    fileSizeMb: 14.8,
    fileSizeBytes: 15518924,
    sha256Hash: 'a812837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://idot.illinois.gov/content/dam/soi/en/web/idot/documents/transportation-system/maps/traffic-counts/2024_Chicago_Expressway_Counts.pdf',
    description: 'Comprehensive high-volume expressway counts for Cook, DuPage, Will, and Lake Counties.',
    coverageArea: 'Northeastern Illinois Regional Area',
    sheetCount: 1,
    resolutionDpi: 400,
    vectorFeaturesCount: 4890
  },

  // Kansas (KDOT)
  {
    id: 'doc-ks-2024-statewide',
    stateCode: 'KS',
    agencyAcronym: 'KDOT',
    title: '2024 Kansas State Highway System Traffic Flow Map',
    year: 2024,
    category: 'Statewide Map',
    format: 'GeoPDF',
    fileSizeMb: 15.6,
    fileSizeBytes: 16357785,
    sha256Hash: 'b912837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://www.ksdot.gov/bureaus/burtransplan/maps/Traffic/2024StatewideTrafficFlow.pdf',
    description: 'Official 2024 Kansas State Highway System AADT volume map prepared by KDOT Bureau of Transportation Planning.',
    coverageArea: 'State of Kansas (105 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 11200
  },

  // Iowa (Iowa DOT)
  {
    id: 'doc-ia-2024-statewide',
    stateCode: 'IA',
    agencyAcronym: 'Iowa DOT',
    title: '2024 Iowa State Highway Traffic Flow Map',
    year: 2024,
    category: 'Statewide Map',
    format: 'GeoPDF',
    fileSizeMb: 14.1,
    fileSizeBytes: 14784921,
    sha256Hash: 'c912837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://iowadot.gov/maps/traffic/2024StatewideTrafficMap.pdf',
    description: 'Annual Average Daily Traffic on primary highways and interstate routes in Iowa.',
    coverageArea: 'State of Iowa (99 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 9800
  },

  // Arkansas (ARDOT)
  {
    id: 'doc-ar-2024-statewide',
    stateCode: 'AR',
    agencyAcronym: 'ARDOT',
    title: '2024 Arkansas Average Daily Traffic (ADT) Map',
    year: 2024,
    category: 'Statewide Map',
    format: 'PDF',
    fileSizeMb: 16.4,
    fileSizeBytes: 17196646,
    sha256Hash: 'd912837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://www.ardot.gov/wp-content/uploads/2024/06/2024-Statewide-ADT.pdf',
    description: 'Official Arkansas state highway system traffic volume map prepared by ARDOT Transportation Planning & Policy.',
    coverageArea: 'State of Arkansas (75 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 10450
  },

  // Tennessee (TDOT)
  {
    id: 'doc-tn-2024-statewide',
    stateCode: 'TN',
    agencyAcronym: 'TDOT',
    title: '2024 Tennessee Statewide Traffic History & AADT Lines',
    year: 2024,
    category: 'Statewide Map',
    format: 'GeoPDF',
    fileSizeMb: 18.9,
    fileSizeBytes: 19818086,
    sha256Hash: 'e912837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://www.tn.gov/content/dam/tn/tdot/documents/2024_Statewide_AADT_Map.pdf',
    description: 'Tennessee official Annual Average Daily Traffic lines mapped across the TDOT linear reference roadway system.',
    coverageArea: 'State of Tennessee (95 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 14800
  },

  // Kentucky (KYTC)
  {
    id: 'doc-ky-2024-statewide',
    stateCode: 'KY',
    agencyAcronym: 'KYTC',
    title: '2024 Kentucky Official Highway Traffic Flow Map',
    year: 2024,
    category: 'Statewide Map',
    format: 'GeoPDF',
    fileSizeMb: 17.2,
    fileSizeBytes: 18035507,
    sha256Hash: 'f912837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://transportation.ky.gov/Planning/Documents/2024_Statewide_Traffic_Flow.pdf',
    description: 'Official Kentucky Transportation Cabinet statewide highway traffic volume and commercial truck flow map.',
    coverageArea: 'Commonwealth of Kentucky (120 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 13900
  },

  // Nebraska (NDOT)
  {
    id: 'doc-ne-2024-statewide',
    stateCode: 'NE',
    agencyAcronym: 'NDOT',
    title: '2024 Nebraska State Highway System Traffic Flow Map',
    year: 2024,
    category: 'Statewide Map',
    format: 'PDF',
    fileSizeMb: 13.8,
    fileSizeBytes: 14470348,
    sha256Hash: '1912837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://dot.nebraska.gov/media/2024-statewide-traffic-flow-map.pdf',
    description: 'Annual Average Daily Traffic on Nebraska state highway system routes and interstate connectors.',
    coverageArea: 'State of Nebraska (93 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 9400
  },

  // Oklahoma (ODOT)
  {
    id: 'doc-ok-2024-statewide',
    stateCode: 'OK',
    agencyAcronym: 'ODOT',
    title: '2024 Oklahoma Highway System AADT Flow Map',
    year: 2024,
    category: 'Statewide Map',
    format: 'GeoPDF',
    fileSizeMb: 16.5,
    fileSizeBytes: 17301504,
    sha256Hash: '2912837491028374910283749102837491028374910283749102837491028374',
    officialUrl: 'https://oklahoma.gov/content/dam/ok/en/odot/documents/2024-traffic-flow-map.pdf',
    description: 'Annual Average Daily Traffic (AADT) volume on state highways and turnpikes prepared by ODOT Traffic Monitoring.',
    coverageArea: 'State of Oklahoma (77 Counties)',
    sheetCount: 1,
    resolutionDpi: 300,
    vectorFeaturesCount: 11900
  }
];
