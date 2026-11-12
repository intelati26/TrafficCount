import { TrafficSegment, NaturalCorridorPackage } from '../types/traffic';
import { downloadFile } from './exportUtils';

/**
 * Finds all adjacent and connected surrounding segments along a travelway
 */
export function findSurroundingSegments(
  rootSegment: TrafficSegment, 
  allSegments: TrafficSegment[], 
  hops: number = 2
): TrafficSegment[] {
  const visited = new Set<string>([rootSegment.id]);
  const queue: { segment: TrafficSegment; depth: number }[] = [{ segment: rootSegment, depth: 0 }];
  const results: TrafficSegment[] = [rootSegment];

  while (queue.length > 0) {
    const { segment, depth } = queue.shift()!;
    if (depth >= hops) continue;

    // 1. Direct topology links (connectedSegmentIds)
    const connectedIds = segment.connectedSegmentIds || [];
    for (const cid of connectedIds) {
      if (!visited.has(cid)) {
        visited.add(cid);
        const nextSeg = allSegments.find((s) => s.id === cid);
        if (nextSeg) {
          results.push(nextSeg);
          queue.push({ segment: nextSeg, depth: depth + 1 });
        }
      }
    }

    // 2. Route & milepost proximity (same route within 15 miles)
    const sameRouteSegments = allSegments.filter(
      (s) => s.route === segment.route && 
             s.stateCode === segment.stateCode && 
             !visited.has(s.id) &&
             (Math.abs(s.logmileStart - segment.logmileEnd) < 15 || Math.abs(s.logmileEnd - segment.logmileStart) < 15)
    );

    for (const s of sameRouteSegments) {
      visited.add(s.id);
      results.push(s);
      queue.push({ segment: s, depth: depth + 1 });
    }
  }

  // Sort sequentially by logmileStart if available
  return results.sort((a, b) => a.logmileStart - b.logmileStart);
}

/**
 * Builds a comprehensive Natural Corridor Package with weighted AADT and VMT metrics
 */
export function buildNaturalCorridorPackage(
  selectedSegments: TrafficSegment[],
  stateCode: string
): NaturalCorridorPackage {
  if (selectedSegments.length === 0) {
    throw new Error('No segments selected for corridor package.');
  }

  const routeName = selectedSegments[0].route;
  const isMultiRoute = selectedSegments.some((s) => s.route !== routeName);
  const corridorName = isMultiRoute 
    ? `Linked Multi-Route Regional Network (${selectedSegments.length} Segments)` 
    : `${routeName} Continuous Highway Corridor`;

  const totalMileage = selectedSegments.reduce((sum, s) => {
    const len = s.mileageLength || Math.max(Math.round((s.logmileEnd - s.logmileStart) * 10) / 10, 1.5);
    return sum + len;
  }, 0);

  const totalDailyVmt = selectedSegments.reduce((sum, s) => {
    const len = s.mileageLength || Math.max(Math.round((s.logmileEnd - s.logmileStart) * 10) / 10, 1.5);
    return sum + (s.aadtCurrent * len);
  }, 0);

  const weightedAadt = totalMileage > 0 ? Math.round(totalDailyVmt / totalMileage) : 0;

  const totalTruckVmt = selectedSegments.reduce((sum, s) => {
    const len = s.mileageLength || Math.max(Math.round((s.logmileEnd - s.logmileStart) * 10) / 10, 1.5);
    return sum + (s.commercialAadt * len);
  }, 0);

  const avgTruckPercent = totalDailyVmt > 0 
    ? Math.round((totalTruckVmt / totalDailyVmt) * 1000) / 10 
    : 0;

  const startMilepost = Math.min(...selectedSegments.map((s) => s.logmileStart));
  const endMilepost = Math.max(...selectedSegments.map((s) => s.logmileEnd));
  const primaryCounties = Array.from(new Set(selectedSegments.map((s) => s.county)));

  return {
    id: `corridor-${routeName.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`,
    corridorName,
    stateCode,
    segments: selectedSegments,
    totalMileage: Math.round(totalMileage * 10) / 10,
    weightedAadt,
    totalDailyVmt: Math.round(totalDailyVmt),
    avgTruckPercent,
    startMilepost,
    endMilepost,
    primaryCounties,
    timestamp: new Date().toISOString()
  };
}

/**
 * Exports Natural Corridor Package as GeoJSON FeatureCollection
 */
export function exportCorridorToGeoJSON(pkg: NaturalCorridorPackage): string {
  const geojson = {
    type: 'FeatureCollection',
    corridorMetadata: {
      corridorName: pkg.corridorName,
      stateCode: pkg.stateCode,
      totalMileageMiles: pkg.totalMileage,
      weightedAverageAadt: pkg.weightedAadt,
      dailyVehicleMilesTraveledVMT: pkg.totalDailyVmt,
      averageTruckPercent: pkg.avgTruckPercent,
      segmentCount: pkg.segments.length,
      countiesTraversed: pkg.primaryCounties,
      exportedAt: pkg.timestamp
    },
    features: pkg.segments.map((s, idx) => ({
      type: 'Feature',
      id: s.id,
      geometry: {
        type: 'LineString',
        coordinates: s.coordinates
      },
      properties: {
        sequenceIndex: idx + 1,
        route: s.route,
        county: s.county,
        description: s.description,
        aadtCurrent: s.aadtCurrent,
        commercialAadt: s.commercialAadt,
        commercialPercent: s.commercialPercent,
        mileageLength: s.mileageLength,
        segmentVmt: Math.round(s.aadtCurrent * (s.mileageLength || 2)),
        logmileStart: s.logmileStart,
        logmileEnd: s.logmileEnd,
        lanes: s.lanes,
        functionalClass: s.functionalClass
      }
    }))
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * Exports Natural Corridor Package as CSV
 */
export function exportCorridorToCSV(pkg: NaturalCorridorPackage): string {
  const metaLines = [
    `# CORRIDOR NAME: ${pkg.corridorName}`,
    `# STATE: ${pkg.stateCode}`,
    `# TOTAL CORRIDOR LENGTH: ${pkg.totalMileage} miles`,
    `# WEIGHTED AVERAGE AADT: ${pkg.weightedAadt} vpd`,
    `# DAILY VEHICLE MILES TRAVELED (VMT): ${pkg.totalDailyVmt.toLocaleString()}`,
    `# AVERAGE TRUCK PERCENT: ${pkg.avgTruckPercent}%`,
    `# COUNTIES: ${pkg.primaryCounties.join(', ')}`,
    `# EXPORTED AT: ${pkg.timestamp}`,
    ''
  ];

  const headers = [
    'Seq',
    'Segment ID',
    'Route',
    'County',
    'Description',
    'Length (mi)',
    '2024 AADT',
    'Commercial AADT',
    'Truck %',
    'Segment Daily VMT',
    'Lanes',
    'Speed Limit',
    'Logmile Start',
    'Logmile End'
  ];

  const rows = pkg.segments.map((s, i) => [
    i + 1,
    `"${s.id}"`,
    `"${s.route}"`,
    `"${s.county}"`,
    `"${s.description.replace(/"/g, '""')}"`,
    s.mileageLength || 2.0,
    s.aadtCurrent,
    s.commercialAadt,
    s.commercialPercent,
    Math.round(s.aadtCurrent * (s.mileageLength || 2.0)),
    s.lanes,
    s.speedLimit,
    s.logmileStart,
    s.logmileEnd
  ]);

  return [...metaLines, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
