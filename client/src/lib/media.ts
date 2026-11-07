import { useEffect, useState } from 'react';
import type { MediaAsset } from '@shared/studio';

const objectURLs = new Map<string,string>();
function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('swiftpilot-media-v1',1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local media storage is unavailable in this browser.'));
  });
}
let _uploadEnabled: boolean | null = null;
export async function uploadMedia(file: File): Promise<MediaAsset> {
  // Remote Bunny Storage when configured; otherwise fall back to the
  // browser-local blob store so uploads always work offline.
  if (_uploadEnabled === null) {
    try { _uploadEnabled = (await (await fetch('/api/studio/upload/status')).json()).enabled === true; }
    catch { _uploadEnabled = false; }
  }
  if (_uploadEnabled) {
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Could not read this file.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/studio/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mime: file.type, data }) });
      if (res.ok) {
        const body = await res.json();
        return { id: crypto.randomUUID(), name: file.name, url: body.url, kind: file.type.startsWith('video/') ? 'video' : 'image', origin: 'upload' };
      }
    } catch { /* remote upload failed — fall through to local */ }
  }
  return uploadLocalMedia(file);
}
export async function uploadLocalMedia(file: File): Promise<MediaAsset> {
  if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type) && !/^video\/(mp4|webm|quicktime)$/.test(file.type)) throw new Error('Choose a PNG, JPG, WebP, GIF, AVIF, MP4, WebM or MOV file. SVG files are not accepted.');
  if (file.size > 50 * 1024 * 1024) throw new Error('Use files smaller than 50 MB.');
  const id = crypto.randomUUID();
  const db = await openMediaDB();
  await new Promise<void>((resolve,reject) => {
    const transaction = db.transaction('files','readwrite');
    transaction.objectStore('files').put(file,id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Could not save this media file. Check available browser storage.'));
  });
  db.close();
  return { id,name:file.name,url:`local-media:${id}`,kind:file.type.startsWith('video/') ? 'video':'image',origin:'upload' };
}
export async function resolveMediaSource(source: string): Promise<string> {
  if (!source.startsWith('local-media:')) return source;
  if (objectURLs.has(source)) return objectURLs.get(source)!;
  const db = await openMediaDB();
  const file = await new Promise<Blob | undefined>((resolve,reject) => {
    const request = db.transaction('files','readonly').objectStore('files').get(source.slice(12));
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(new Error('Could not open the saved media.'));
  });
  db.close();
  if (!file) throw new Error('This uploaded file is missing from local storage. Please upload it again.');
  const url = URL.createObjectURL(file); objectURLs.set(source,url); return url;
}
export function useMediaSource(source: string): string {
  const [url,setURL] = useState(source.startsWith('local-media:') ? '' : source);
  useEffect(() => {
    let active = true;
    setURL(source.startsWith('local-media:') ? '' : source);
    resolveMediaSource(source).then(value => { if(active) setURL(value); }).catch(() => { if(active) setURL(''); });
    return () => { active=false; };
  },[source]);
  return url;
}
export function mediaProxyURL(url: string): string {
  return /^https?:\/\//i.test(url) ? `/api/studio/media?url=${encodeURIComponent(url)}` : url;
}
export async function downloadableMediaURL(source: string): Promise<string> {
  return mediaProxyURL(await resolveMediaSource(source));
}
export async function downloadOriginal(asset: MediaAsset): Promise<void> {
  const response = await fetch(await downloadableMediaURL(asset.url));
  if (!response.ok) throw new Error('Could not download this media. The source website may restrict access.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=asset.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
