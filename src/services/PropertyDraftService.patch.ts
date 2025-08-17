import { saveDraft as baseSaveDraft } from './storage/PropertyDraftService';

export async function saveDraftWithoutEmbeddingPhotos(draft: any) {
  const clean = { ...draft };
  
  if (Array.isArray(clean.photos)) {
    clean.photos = clean.photos.map((p: any) => ({
      url: p.url,
      path: p.path,
      areaId: p.areaId
    }));
  }
  
  return baseSaveDraft(clean);
}