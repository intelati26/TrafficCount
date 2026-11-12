import type { MoDOTMapDocument } from '../types/traffic';

export type SaveResult = 'saved' | 'opened' | 'cancelled';

const fileName = (doc: MoDOTMapDocument) => {
  const ext = doc.officialUrl.match(/\.(pdf|tif|tiff|zip|shp)(\?|$)/i)?.[1]?.toLowerCase() ?? (doc.format === 'PDF' || doc.format === 'GeoPDF' ? 'pdf' : 'bin');
  return `${doc.stateCode ?? 'XX'}_${doc.year}_${doc.title}`.replace(/[^\w.-]+/g, '_').slice(0, 120) + '.' + ext;
};

/** Open the agency's file in a new tab. The app never stores PDF bytes. */
export function openDocument(doc: MoDOTMapDocument) {
  window.open(doc.officialUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Save the file to the user's disk for off-app viewing. Uses the save picker where available.
 * Many agency hosts block cross-origin fetches (CORS); then we fall back to opening the link so the browser can save it.
 */
export async function saveDocument(doc: MoDOTMapDocument): Promise<SaveResult> {
  const name = fileName(doc);
  const picker = (window as any).showSaveFilePicker as undefined | ((o: object) => Promise<any>);
  let handle: any;
  try {
    if (picker) handle = await picker({ suggestedName: name }); // must run inside the click gesture, before any await on the network
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'cancelled';
  }
  try {
    const res = await fetch(doc.officialUrl);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    if (handle) {
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }
    return 'saved';
  } catch {
    openDocument(doc);
    return 'opened';
  }
}
