import { TrafficSegment, MoDOTMapDocument, ContinuousCountStation } from '../types/traffic';

/**
 * Downloads a string content as a file in the browser
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts traffic segments into standard GeoJSON FeatureCollection
 */
export function exportSegmentsToGeoJSON(segments: TrafficSegment[]): string {
  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      generatedBy: 'MoDOT Traffic Volume Archive Workstation',
      crs: 'EPSG:4326',
      featureCount: segments.length,
      exportedAt: new Date().toISOString()
    },
    features: segments.map((seg) => ({
      type: 'Feature',
      id: seg.id,
      geometry: {
        type: 'LineString',
        coordinates: seg.coordinates
      },
      properties: {
        route: seg.route,
        routeType: seg.routeType,
        county: seg.county,
        districtId: seg.districtId,
        description: seg.description,
        aadtCurrent: seg.aadtCurrent,
        aadt2023: seg.aadt2023,
        aadt2022: seg.aadt2022,
        aadt2019: seg.aadt2019,
        commercialAadt: seg.commercialAadt,
        commercialPercent: seg.commercialPercent,
        lanes: seg.lanes,
        speedLimit: seg.speedLimit,
        functionalClass: seg.functionalClass,
        kFactor: seg.kFactor,
        dFactor: seg.dFactor,
        logmileStart: seg.logmileStart,
        logmileEnd: seg.logmileEnd
      }
    }))
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * Converts traffic segments into CSV spreadsheet
 */
export function exportSegmentsToCSV(segments: TrafficSegment[]): string {
  const headers = [
    'Segment ID',
    'Route',
    'Route Type',
    'County',
    'District',
    'Description',
    '2024 AADT',
    '2023 AADT',
    '2022 AADT',
    '2019 AADT',
    'Commercial AADT',
    'Commercial %',
    'Peak Hour Volume',
    'K-Factor',
    'D-Factor',
    'Lanes',
    'Speed Limit',
    'Functional Class',
    'Logmile Start',
    'Logmile End'
  ];

  const rows = segments.map((seg) => [
    `"${seg.id}"`,
    `"${seg.route}"`,
    `"${seg.routeType}"`,
    `"${seg.county}"`,
    `"${seg.districtId}"`,
    `"${seg.description.replace(/"/g, '""')}"`,
    seg.aadtCurrent,
    seg.aadt2023,
    seg.aadt2022,
    seg.aadt2019,
    seg.commercialAadt,
    seg.commercialPercent,
    seg.peakHourVolume,
    seg.kFactor,
    seg.dFactor,
    seg.lanes,
    seg.speedLimit,
    `"${seg.functionalClass}"`,
    seg.logmileStart,
    seg.logmileEnd
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Converts documents catalog into CSV
 */
export function exportDocumentsToCSV(docs: MoDOTMapDocument[]): string {
  const headers = [
    'Document ID',
    'Title',
    'Year',
    'Category',
    'District',
    'Format',
    'File Size MB',
    'SHA-256 Hash',
    'Archived Locally',
    'Official MoDOT URL',
    'Coverage Area'
  ];

  const rows = docs.map((doc) => [
    `"${doc.id}"`,
    `"${doc.title.replace(/"/g, '""')}"`,
    doc.year,
    `"${doc.category}"`,
    `"${doc.districtName || 'Statewide'}"`,
    `"${doc.format}"`,
    doc.fileSizeMb,
    `"${doc.sha256Hash}"`,
    doc.archivedLocally ? 'YES' : 'NO',
    `"${doc.officialUrl}"`,
    `"${doc.coverageArea.replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
