/**
 * High-Detail State Boundaries, Neighboring Topologies, and Major Waterway Corridors
 * Provides authentic, high-resolution geospatial vector polygons for state DOT mapping.
 */

export interface DetailedStateBoundary {
  code: string;
  name: string;
  polygon: [number, number][]; // [longitude, latitude]
  labelPoint: [number, number]; // [longitude, latitude] for label placement
  adjacentStateCodes: string[];
}

export interface WaterwayFeature {
  id: string;
  name: string;
  type: 'river' | 'lake_coast';
  path: [number, number][];
}

// High-resolution border polygons for states with natural river and coastal contours
export const DETAILED_STATE_BOUNDARIES: Record<string, DetailedStateBoundary> = {
  MO: {
    code: 'MO',
    name: 'Missouri',
    labelPoint: [-92.40, 38.45],
    adjacentStateCodes: ['IA', 'IL', 'KY', 'TN', 'AR', 'OK', 'KS', 'NE'],
    polygon: [
      // Iowa border (straight line along 40°35' N)
      [-95.77, 40.58],
      [-95.00, 40.58],
      [-94.20, 40.58],
      [-93.40, 40.58],
      [-92.60, 40.58],
      [-91.73, 40.58],
      // Des Moines River down to Keokuk/Alexandria confluence with Mississippi
      [-91.60, 40.48],
      [-91.46, 40.38],
      // Mississippi River winding south (Illinois border)
      [-91.48, 40.25],
      [-91.50, 40.12], // Canton
      [-91.42, 39.95], // Quincy IL approach
      [-91.35, 39.71], // Hannibal
      [-91.22, 39.55],
      [-91.05, 39.42], // Louisiana MO
      [-90.85, 39.28],
      [-90.67, 39.00], // Illinois River confluence / Pere Marquette
      [-90.45, 38.95], // Alton IL approach
      [-90.18, 38.83], // Missouri River confluence / Chain of Rocks
      [-90.18, 38.63], // St. Louis Gateway Arch / Poplar St Bridge
      [-90.22, 38.52],
      [-90.35, 38.25], // Herculaneum
      [-90.30, 38.08],
      [-90.10, 38.00], // Ste. Genevieve
      [-89.85, 37.80], // Chester
      [-89.50, 37.50], // Grand Tower
      [-89.48, 37.40],
      [-89.52, 37.31], // Cape Girardeau
      [-89.45, 37.15], // Commerce
      [-89.15, 36.98], // Cairo confluence of Ohio & Mississippi (KY border starts)
      // Mississippi River along Kentucky border
      [-89.20, 36.75], // Columbus KY
      [-89.35, 36.65], // Hickman KY
      [-89.55, 36.58], // New Madrid bend
      [-89.48, 36.50], // Kentucky Bend line
      // Mississippi River along Tennessee border
      [-89.60, 36.30], // Tiptonville TN
      [-89.65, 36.15], // Caruthersville MO
      [-89.55, 36.00], // Southernmost Mississippi River point in MO Bootheel
      // Bootheel southern border along 36°00' N (Arkansas border)
      [-89.70, 36.00],
      [-89.90, 36.00],
      [-90.10, 36.00],
      // St. Francis River northward along Bootheel western edge to 36°30' N
      [-90.12, 36.15],
      [-90.20, 36.30],
      [-90.30, 36.50], // Campbell / Kennett junction at 36°30' N
      // Southern border with Arkansas along 36°30' N
      [-90.80, 36.50],
      [-91.40, 36.50],
      [-92.00, 36.50],
      [-92.80, 36.50],
      [-93.60, 36.50],
      [-94.20, 36.50],
      [-94.61, 36.50], // Southwest corner of MO (Arkansas & Oklahoma corner)
      // Western border with Oklahoma along 94°37' W
      [-94.61, 36.80],
      [-94.61, 37.00], // Oklahoma / Kansas corner at Joplin area
      // Western border with Kansas along 94°37' W
      [-94.61, 37.50],
      [-94.61, 38.00],
      [-94.61, 38.50],
      [-94.61, 39.12], // Kansas City / Kaw Point (confluence with Kansas River)
      // Missouri River winding north along Kansas border
      [-94.85, 39.22],
      [-95.08, 39.40], // Leavenworth KS
      [-94.95, 39.55], // Atchison KS
      [-94.88, 39.75], // St. Joseph MO
      [-94.98, 39.85],
      [-95.20, 39.92],
      [-95.34, 40.00], // Nebraska / Kansas state line on river
      // Missouri River winding north along Nebraska border (Platte Purchase)
      [-95.50, 40.08],
      [-95.65, 40.22], // Brownville NE
      [-95.80, 40.40], // Nebraska City NE
      [-95.83, 40.53],
      [-95.77, 40.58]  // Northwest corner of Missouri
    ]
  },

  IL: {
    code: 'IL',
    name: 'Illinois',
    labelPoint: [-89.20, 40.00],
    adjacentStateCodes: ['WI', 'IA', 'MO', 'KY', 'IN'],
    polygon: [
      [-90.65, 42.50], // NW corner on Mississippi (Dubuque area)
      [-89.50, 42.50],
      [-88.50, 42.50],
      [-87.80, 42.50], // Wisconsin border at Lake Michigan
      // Lake Michigan shoreline
      [-87.75, 42.35], // Waukegan
      [-87.68, 42.05], // Evanston
      [-87.62, 41.88], // Chicago Loop
      [-87.52, 41.76], // Indiana state line at Wolf Lake
      // Indiana border straight south
      [-87.52, 41.00],
      [-87.52, 40.00],
      [-87.52, 39.35], // Terre Haute Wabash River contact
      // Wabash River winding south
      [-87.58, 38.75], // Vincennes
      [-87.75, 38.30], // Mount Carmel
      [-88.00, 37.85], // Wabash confluence with Ohio River
      // Ohio River along Kentucky border
      [-88.25, 37.50], // Cave-in-Rock
      [-88.55, 37.15], // Golconda
      [-88.75, 37.10], // Metropolis
      [-89.15, 36.98], // Cairo confluence with Mississippi River
      // Mississippi River winding north along Missouri border
      [-89.45, 37.15],
      [-89.52, 37.31], // Cape Girardeau
      [-89.85, 37.80], // Chester
      [-90.10, 38.00],
      [-90.35, 38.25],
      [-90.18, 38.63], // St. Louis / East St. Louis
      [-90.18, 38.83], // Alton / Chain of Rocks
      [-90.67, 39.00], // Grafton
      [-91.05, 39.42],
      [-91.35, 39.71], // Hannibal / Quincy
      [-91.46, 40.38], // Keokuk / Hamilton
      // Mississippi River along Iowa border
      [-91.10, 40.75], // Fort Madison / Burlington
      [-91.00, 41.20],
      [-90.57, 41.52], // Rock Island / Moline / Davenport
      [-90.20, 41.85], // Clinton IA
      [-90.40, 42.20], // Savanna
      [-90.65, 42.50]  // East Dubuque
    ]
  },

  KS: {
    code: 'KS',
    name: 'Kansas',
    labelPoint: [-98.30, 38.50],
    adjacentStateCodes: ['NE', 'MO', 'OK', 'CO'],
    polygon: [
      [-102.05, 40.00], // NW corner
      [-98.00, 40.00],
      [-96.00, 40.00],
      [-95.34, 40.00], // NE corner on Missouri River
      // Missouri River winding down
      [-95.20, 39.92],
      [-94.98, 39.85],
      [-94.95, 39.55], // Atchison
      [-95.08, 39.40], // Leavenworth
      [-94.85, 39.22],
      [-94.61, 39.12], // KC Kaw Point
      // Missouri straight border
      [-94.61, 38.50],
      [-94.61, 38.00],
      [-94.61, 37.00], // SE corner at OK border
      // Oklahoma southern border
      [-96.00, 37.00],
      [-98.00, 37.00],
      [-100.00, 37.00],
      [-102.05, 37.00], // SW corner
      // Colorado western border
      [-102.05, 38.50],
      [-102.05, 40.00]
    ]
  },

  IA: {
    code: 'IA',
    name: 'Iowa',
    labelPoint: [-93.50, 42.00],
    adjacentStateCodes: ['MN', 'WI', 'IL', 'MO', 'NE', 'SD'],
    polygon: [
      [-96.60, 43.50], // NW corner on Big Sioux River
      [-94.00, 43.50],
      [-92.00, 43.50],
      [-91.20, 43.50], // NE corner on Mississippi River (New Albin)
      // Mississippi River winding south (Wisconsin & Illinois borders)
      [-91.15, 43.00], // Marquette / Prairie du Chien
      [-90.65, 42.50], // Dubuque
      [-90.40, 42.20],
      [-90.20, 41.85], // Clinton
      [-90.57, 41.52], // Davenport / Bettendorf
      [-91.00, 41.20], // Muscatine
      [-91.10, 40.75], // Burlington
      [-91.38, 40.40], // Keokuk
      [-91.46, 40.38], // SE tip at Des Moines River mouth
      // Missouri border (Des Moines River & 40°35' N line)
      [-91.73, 40.58],
      [-92.60, 40.58],
      [-93.40, 40.58],
      [-94.20, 40.58],
      [-95.00, 40.58],
      [-95.77, 40.58], // SW corner on Missouri River
      // Missouri River winding north (Nebraska border)
      [-95.83, 40.80],
      [-95.86, 41.26], // Council Bluffs / Omaha
      [-96.05, 41.60],
      [-96.25, 42.00],
      [-96.45, 42.50], // Sioux City
      // Big Sioux River (South Dakota border)
      [-96.55, 43.00],
      [-96.60, 43.50]
    ]
  },

  AR: {
    code: 'AR',
    name: 'Arkansas',
    labelPoint: [-92.40, 34.80],
    adjacentStateCodes: ['MO', 'TN', 'MS', 'LA', 'TX', 'OK'],
    polygon: [
      [-94.61, 36.50], // NW corner
      [-93.00, 36.50],
      [-91.50, 36.50],
      [-90.30, 36.50], // Bootheel intersection
      // St. Francis River south along Bootheel
      [-90.20, 36.30],
      [-90.12, 36.15],
      [-90.10, 36.00], // Southern tip of Bootheel
      [-89.55, 36.00], // Mississippi River bank
      // Mississippi River winding south (Tennessee & Mississippi borders)
      [-89.80, 35.70],
      [-90.00, 35.40],
      [-90.18, 35.15], // West Memphis / Memphis TN
      [-90.55, 34.50], // Helena
      [-91.05, 33.90],
      [-91.15, 33.00], // SE corner on Mississippi at Louisiana border
      // Louisiana southern border along 33° N
      [-92.00, 33.00],
      [-93.00, 33.00],
      [-94.04, 33.00], // SW corner on Texas border
      // Texas border north along 94°02' W to Red River
      [-94.04, 33.60], // Texarkana / Red River
      // Oklahoma western border
      [-94.45, 34.00],
      [-94.45, 35.38], // Fort Smith
      [-94.61, 36.00],
      [-94.61, 36.50]
    ]
  },

  TN: {
    code: 'TN',
    name: 'Tennessee',
    labelPoint: [-86.30, 35.80],
    adjacentStateCodes: ['KY', 'VA', 'NC', 'GA', 'AL', 'MS', 'AR', 'MO'],
    polygon: [
      [-90.18, 35.00], // SW corner at Memphis / Mississippi border
      [-90.18, 35.15], // Memphis downtown on river
      [-90.00, 35.40],
      [-89.80, 35.70],
      [-89.55, 36.00], // MO Bootheel line
      [-89.65, 36.15],
      [-89.48, 36.50], // Kentucky bend on Mississippi River
      // Kentucky northern border
      [-88.80, 36.50],
      [-88.00, 36.60],
      [-86.50, 36.63],
      [-85.00, 36.60],
      [-83.00, 36.58],
      [-81.85, 36.60], // NE tip at Bristol VA/TN
      // Appalachian ridge with North Carolina
      [-82.20, 36.10],
      [-83.00, 35.80],
      [-83.80, 35.50], // Great Smoky Mountains
      [-84.30, 35.00], // SE corner at Georgia border
      // Georgia and Alabama southern border along 35° N
      [-85.31, 35.00], // Chattanooga
      [-86.00, 35.00],
      [-87.00, 35.00],
      [-88.20, 35.00], // Alabama/Mississippi border
      [-89.00, 35.00],
      [-90.18, 35.00]
    ]
  },

  KY: {
    code: 'KY',
    name: 'Kentucky',
    labelPoint: [-85.50, 37.60],
    adjacentStateCodes: ['IL', 'IN', 'OH', 'WV', 'VA', 'TN', 'MO'],
    polygon: [
      [-89.15, 36.98], // Cairo confluence with Ohio River
      // Mississippi River down to Kentucky Bend
      [-89.20, 36.75],
      [-89.48, 36.50], // KY Bend / TN line
      // Tennessee southern border along 36°30' N
      [-88.00, 36.50],
      [-86.50, 36.60],
      [-85.00, 36.60],
      [-83.70, 36.60], // Cumberland Gap
      // Virginia border along Pine Mountain
      [-83.00, 37.00],
      [-82.30, 37.30],
      [-82.00, 37.50], // Pikeville / Tug Fork (WV line)
      // Tug Fork & Big Sandy River along West Virginia
      [-82.30, 38.00],
      [-82.60, 38.45], // Catlettsburg / Ashland confluence with Ohio River
      // Ohio River winding west along Ohio border
      [-83.00, 38.70],
      [-83.50, 38.70],
      [-84.30, 38.90],
      [-84.50, 39.10], // Covington / Cincinnati OH
      [-84.80, 39.10], // Indiana border intersection
      // Ohio River winding west along Indiana border
      [-85.20, 38.75],
      [-85.75, 38.25], // Louisville
      [-86.40, 38.00],
      [-87.10, 37.85], // Owensboro
      [-87.58, 38.00], // Henderson / Evansville
      [-88.00, 37.85], // Wabash River confluence
      // Ohio River along Illinois border
      [-88.25, 37.50],
      [-88.55, 37.15],
      [-88.75, 37.10], // Paducah / Metropolis
      [-89.15, 36.98]
    ]
  },

  NE: {
    code: 'NE',
    name: 'Nebraska',
    labelPoint: [-99.50, 41.50],
    adjacentStateCodes: ['SD', 'IA', 'MO', 'KS', 'CO', 'WY'],
    polygon: [
      [-104.05, 43.00], // NW corner
      [-98.50, 43.00],
      // Missouri River along South Dakota border
      [-97.00, 42.80],
      [-96.45, 42.50], // Sioux City / South Sioux City
      // Missouri River along Iowa border
      [-96.25, 42.00],
      [-96.05, 41.60],
      [-95.85, 41.25], // Omaha
      [-95.83, 40.80],
      [-95.77, 40.58], // Missouri border on river
      // Missouri River along Missouri border
      [-95.65, 40.22],
      [-95.50, 40.08],
      [-95.34, 40.00], // SE corner at Kansas border
      // Kansas southern border along 40° N
      [-98.00, 40.00],
      [-100.00, 40.00],
      [-102.05, 40.00], // Colorado corner
      // Colorado border
      [-102.05, 41.00], // Panhandle step
      [-104.05, 41.00], // SW corner
      // Wyoming western border
      [-104.05, 42.00],
      [-104.05, 43.00]
    ]
  },

  OK: {
    code: 'OK',
    name: 'Oklahoma',
    labelPoint: [-97.50, 35.50],
    adjacentStateCodes: ['KS', 'MO', 'AR', 'TX', 'NM', 'CO'],
    polygon: [
      [-103.00, 37.00], // NW corner of panhandle
      [-100.00, 37.00], // Panhandle end
      [-97.00, 37.00],
      [-94.61, 37.00], // NE corner at MO border
      // Missouri border
      [-94.61, 36.50], // Arkansas corner
      // Arkansas border
      [-94.61, 36.00],
      [-94.45, 35.38], // Fort Smith
      [-94.45, 34.00],
      [-94.40, 33.60], // SE corner on Red River at Texas border
      // Red River winding west along Texas border
      [-95.50, 33.90],
      [-96.50, 33.85],
      [-97.30, 33.80],
      [-98.20, 34.10],
      [-99.20, 34.35],
      [-100.00, 34.55], // 100th meridian intersection on Red River
      // 100th meridian north to 36°30' N
      [-100.00, 36.50],
      // Panhandle south border with Texas along 36°30' N
      [-101.50, 36.50],
      [-103.00, 36.50], // SW corner of panhandle at NM border
      // New Mexico border
      [-103.00, 37.00]
    ]
  },

  TX: {
    code: 'TX',
    name: 'Texas',
    labelPoint: [-99.00, 31.00],
    adjacentStateCodes: ['NM', 'OK', 'AR', 'LA'],
    polygon: [
      [-106.50, 31.75], // El Paso
      [-103.00, 32.00], // New Mexico corner
      [-103.00, 36.50], // Panhandle NW corner
      [-100.00, 36.50], // Panhandle NE corner
      [-100.00, 34.55], // Red River step
      // Red River along Oklahoma
      [-99.20, 34.35],
      [-98.20, 34.10],
      [-97.30, 33.80],
      [-96.50, 33.85],
      [-94.40, 33.60],
      [-94.04, 33.60], // Texarkana AR line
      [-94.04, 33.00], // Louisiana line
      // Sabine River along Louisiana
      [-93.85, 32.00],
      [-93.85, 30.50],
      [-93.85, 29.70], // Sabine Pass on Gulf
      // Gulf Coastline
      [-94.80, 29.30], // Galveston
      [-96.00, 28.60],
      [-97.10, 27.80], // Corpus Christi
      [-97.15, 26.00], // Brownsville / Rio Grande mouth
      // Rio Grande along Mexico border
      [-98.50, 26.20], // McAllen
      [-99.50, 27.50], // Laredo
      [-100.50, 28.70], // Eagle Pass
      [-101.00, 29.35], // Del Rio
      [-103.50, 29.00], // Big Bend southernmost bend
      [-104.50, 30.50], // Presidio
      [-106.50, 31.75]  // El Paso
    ]
  },

  IN: {
    code: 'IN',
    name: 'Indiana',
    labelPoint: [-86.20, 39.80],
    adjacentStateCodes: ['MI', 'OH', 'KY', 'IL'],
    polygon: [
      [-87.52, 41.76], // NW corner on Lake Michigan
      [-86.80, 41.76], // Michigan line
      [-84.80, 41.76], // NE corner at Ohio line
      // Ohio eastern border
      [-84.80, 40.50],
      [-84.80, 39.10], // Confluence near Cincinnati
      // Ohio River along Kentucky
      [-85.20, 38.75],
      [-85.75, 38.25], // Louisville / Jeffersonville
      [-86.40, 38.00],
      [-87.10, 37.85],
      [-87.58, 38.00], // Evansville
      [-88.00, 37.85], // Wabash River confluence
      // Wabash River along Illinois
      [-87.75, 38.30],
      [-87.58, 38.75],
      [-87.52, 39.35],
      // Illinois straight border
      [-87.52, 40.50],
      [-87.52, 41.76]
    ]
  },

  OH: {
    code: 'OH',
    name: 'Ohio',
    labelPoint: [-82.70, 40.20],
    adjacentStateCodes: ['MI', 'PA', 'WV', 'KY', 'IN'],
    polygon: [
      [-84.80, 41.70], // NW corner at Michigan border
      [-83.50, 41.70], // Toledo Lake Erie
      // Lake Erie Shoreline
      [-82.70, 41.50], // Sandusky
      [-81.70, 41.50], // Cleveland
      [-80.52, 42.00], // NE corner at PA border
      // Pennsylvania eastern border
      [-80.52, 41.00],
      [-80.52, 40.60], // Ohio River intersection
      // Ohio River along West Virginia
      [-80.60, 40.00], // Wheeling approach
      [-81.30, 39.40], // Marietta
      [-82.20, 38.80], // Gallipolis
      [-82.60, 38.50], // Portsmouth / Catlettsburg
      // Ohio River along Kentucky
      [-83.00, 38.70],
      [-83.50, 38.70],
      [-84.30, 38.90],
      [-84.50, 39.10], // Cincinnati
      [-84.80, 39.10], // SW corner at IN border
      // Indiana western border
      [-84.80, 40.50],
      [-84.80, 41.70]
    ]
  },

  CO: {
    code: 'CO',
    name: 'Colorado',
    labelPoint: [-105.50, 39.00],
    adjacentStateCodes: ['WY', 'NE', 'KS', 'OK', 'NM', 'UT'],
    polygon: [
      [-109.05, 41.00], // NW corner
      [-104.05, 41.00],
      [-102.05, 41.00], // NE corner
      [-102.05, 37.00], // SE corner
      [-109.05, 37.00], // SW corner (Four Corners)
      [-109.05, 41.00]
    ]
  },

  MN: {
    code: 'MN',
    name: 'Minnesota',
    labelPoint: [-94.20, 46.00],
    adjacentStateCodes: ['ND', 'SD', 'IA', 'WI'],
    polygon: [
      [-97.20, 49.00], // NW corner at Canada
      [-95.15, 49.38], // Lake of the Woods Northwest Angle
      [-94.50, 48.60], // Rainy River
      [-92.50, 48.20],
      [-89.50, 48.00], // Grand Portage Lake Superior
      // Lake Superior Coastline
      [-90.50, 47.50],
      [-92.10, 46.75], // Duluth
      // St. Louis & St. Croix Rivers along Wisconsin
      [-92.80, 45.30],
      [-92.80, 44.75], // Hastings / Mississippi confluence
      // Mississippi River along Wisconsin
      [-92.40, 44.40], // Red Wing
      [-91.80, 44.00], // Winona
      [-91.20, 43.50], // SE corner at Iowa border
      // Iowa southern border along 43°30' N
      [-93.50, 43.50],
      [-96.60, 43.50], // SW corner at SD border
      // South Dakota & North Dakota borders (Red River)
      [-96.85, 46.00], // Fargo / Moorhead
      [-97.05, 47.90], // Grand Forks
      [-97.20, 49.00]
    ]
  },

  WI: {
    code: 'WI',
    name: 'Wisconsin',
    labelPoint: [-89.80, 44.50],
    adjacentStateCodes: ['MN', 'MI', 'IL', 'IA'],
    polygon: [
      [-92.10, 46.75], // Superior / Duluth
      [-90.80, 46.90], // Bayfield Peninsula
      [-90.40, 46.50],
      // Michigan Upper Peninsula border
      [-88.50, 46.00],
      [-87.50, 45.10], // Marinette / Menominee
      // Green Bay & Door County
      [-87.30, 45.30], // Door County peninsula tip
      [-87.00, 44.80],
      // Lake Michigan coastline
      [-87.50, 44.00], // Manitowoc
      [-87.90, 43.04], // Milwaukee
      [-87.80, 42.50], // Kenosha / Illinois line
      // Illinois southern border along 42°30' N
      [-89.00, 42.50],
      [-90.65, 42.50], // SW corner on Mississippi River
      // Mississippi River along Iowa & Minnesota
      [-91.15, 43.00],
      [-91.24, 43.80], // La Crosse
      [-91.80, 44.00],
      [-92.40, 44.40],
      [-92.80, 44.75], // St. Croix River mouth
      // St. Croix River along Minnesota
      [-92.80, 45.30],
      [-92.10, 46.75]
    ]
  },

  MI: {
    code: 'MI',
    name: 'Michigan',
    labelPoint: [-84.50, 43.50],
    adjacentStateCodes: ['WI', 'IN', 'OH'],
    polygon: [
      // Lower Peninsula
      [-86.80, 41.76], // SW corner at IN border
      [-86.50, 42.50], // Lake Michigan shore
      [-86.30, 43.50],
      [-85.80, 44.80], // Traverse City
      [-84.70, 45.80], // Mackinaw City
      [-84.00, 45.40], // Lake Huron shore
      [-83.40, 44.00], // Saginaw Bay
      [-82.60, 43.50], // Thumb
      [-82.40, 43.00], // Port Huron / St. Clair River
      [-83.05, 42.33], // Detroit River
      [-83.45, 41.70], // Monroe / Ohio line
      // Ohio southern border
      [-84.80, 41.70],
      // Indiana southern border
      [-86.80, 41.76]
    ]
  },

  FL: {
    code: 'FL',
    name: 'Florida',
    labelPoint: [-82.50, 28.50],
    adjacentStateCodes: ['AL', 'GA'],
    polygon: [
      [-87.60, 31.00], // NW corner at AL border (Perdido River)
      [-85.00, 31.00], // Chattahoochee River
      [-85.00, 30.70],
      [-82.00, 30.50], // Georgia line
      [-81.40, 30.70], // St. Marys River on Atlantic
      // Atlantic coastline
      [-81.60, 30.30], // Jacksonville
      [-81.20, 29.90], // St. Augustine
      [-81.00, 29.20], // Daytona
      [-80.60, 28.40], // Cape Canaveral
      [-80.10, 26.70], // West Palm Beach
      [-80.14, 26.12], // Fort Lauderdale
      [-80.19, 25.76], // Miami
      [-80.40, 25.00], // Florida Keys upper
      [-81.80, 24.55], // Key West
      // Gulf of Mexico coastline
      [-81.40, 25.80], // Everglades City
      [-81.80, 26.60], // Fort Myers
      [-82.60, 27.80], // Tampa Bay / St. Petersburg
      [-82.70, 28.80], // Crystal River
      [-83.60, 29.80], // Big Bend
      [-84.30, 29.90], // Apalachee Bay
      [-85.30, 29.70], // Cape San Blas
      [-85.70, 30.15], // Panama City
      [-87.30, 30.35], // Pensacola Bay
      [-87.60, 30.30], // Perdido Bay
      [-87.60, 31.00]
    ]
  },

  CA: {
    code: 'CA',
    name: 'California',
    labelPoint: [-119.50, 37.00],
    adjacentStateCodes: ['OR', 'NV', 'AZ'],
    polygon: [
      [-124.25, 42.00], // NW corner at Oregon border
      [-120.00, 42.00], // NE corner at Nevada border
      [-120.00, 39.00], // Lake Tahoe NV step
      [-114.60, 35.00], // Needles Colorado River
      [-114.60, 32.70], // Yuma AZ border / Colorado River
      [-117.15, 32.53], // San Diego / Tijuana Mexico border
      // Pacific Coastline
      [-117.35, 33.15], // Oceanside
      [-118.25, 33.75], // Long Beach / LA harbor
      [-118.50, 34.00], // Santa Monica
      [-119.30, 34.25], // Ventura
      [-119.70, 34.40], // Santa Barbara
      [-120.65, 34.60], // Point Conception
      [-121.90, 36.60], // Monterey Bay
      [-122.42, 37.77], // San Francisco Golden Gate
      [-123.00, 38.30], // Bodega Bay
      [-123.80, 39.30], // Mendocino
      [-124.25, 40.50], // Cape Mendocino
      [-124.16, 40.80], // Eureka / Humboldt Bay
      [-124.25, 42.00]  // Crescent City
    ]
  }
};

// Major Strategic Waterway Corridors
export const MAJOR_WATERWAYS: WaterwayFeature[] = [
  {
    id: 'river-mississippi',
    name: 'Mississippi River',
    type: 'river',
    path: [
      [-95.00, 47.20], // Lake Itasca MN
      [-93.26, 44.98], // Minneapolis
      [-91.20, 43.50], // MN / IA / WI junction
      [-90.65, 42.50], // Dubuque
      [-90.57, 41.52], // Quad Cities (Davenport / Rock Island)
      [-91.10, 40.75], // Burlington
      [-91.46, 40.38], // Keokuk
      [-91.35, 39.71], // Hannibal
      [-90.67, 39.00], // Grafton (Illinois River confluence)
      [-90.18, 38.83], // Missouri River confluence / Chain of Rocks
      [-90.18, 38.63], // St. Louis Gateway Arch
      [-89.52, 37.31], // Cape Girardeau
      [-89.15, 36.98], // Cairo IL (Ohio River confluence)
      [-89.48, 36.50], // New Madrid
      [-89.55, 36.00], // Caruthersville / Bootheel tip
      [-90.18, 35.15], // Memphis TN
      [-91.15, 33.00], // Greenville MS
      [-91.40, 31.55], // Natchez MS
      [-91.18, 30.45], // Baton Rouge LA
      [-90.07, 29.95], // New Orleans
      [-89.25, 29.15]  // Delta Gulf of Mexico
    ]
  },
  {
    id: 'river-missouri',
    name: 'Missouri River',
    type: 'river',
    path: [
      [-104.05, 47.90], // MT/ND border
      [-100.75, 46.80], // Bismarck ND
      [-100.35, 44.37], // Pierre SD
      [-96.45, 42.50],  // Sioux City IA
      [-95.85, 41.25],  // Omaha NE / Council Bluffs IA
      [-95.77, 40.58],  // IA/MO border
      [-94.88, 39.75],  // St. Joseph MO
      [-94.61, 39.12],  // Kansas City (Kaw Point confluence)
      [-93.50, 39.20],  // Lexington MO
      [-92.75, 38.97],  // Boonville MO
      [-92.17, 38.58],  // Jefferson City MO (State Capitol)
      [-91.50, 38.65],  // Hermann MO
      [-91.15, 38.55],  // Washington MO
      [-90.50, 38.78],  // St. Charles MO (I-70 Blanchette Bridge)
      [-90.18, 38.83]   // Confluence with Mississippi River
    ]
  },
  {
    id: 'river-ohio',
    name: 'Ohio River',
    type: 'river',
    path: [
      [-80.00, 40.44], // Pittsburgh PA (The Point)
      [-80.60, 40.60], // OH/PA border
      [-80.70, 40.06], // Wheeling WV
      [-81.45, 39.42], // Marietta OH
      [-82.60, 38.50], // Ashland KY / Huntington WV
      [-84.50, 39.10], // Cincinnati OH / Covington KY
      [-85.75, 38.25], // Louisville KY
      [-87.58, 38.00], // Evansville IN / Henderson KY
      [-88.00, 37.85], // Wabash River confluence
      [-88.75, 37.10], // Metropolis IL / Paducah KY
      [-89.15, 36.98]  // Cairo IL confluence with Mississippi River
    ]
  }
];
