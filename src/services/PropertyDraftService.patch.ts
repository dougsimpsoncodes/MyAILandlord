import { saveDraft as baseSaveDraft } from './storage/PropertyDraftService';
import { PropertySetupState } from '../types/property';
import { Photo } from '../types/photo';

export async function saveDraftWithoutEmbeddingPhotos(draft: PropertySetupState) {
  const clean = { ...draft };

  if (Array.isArray(clean.photos)) {
    clean.photos = clean.photos.map((p: Photo) => ({
      url: p.url,
      path: p.path,
      areaId: p.areaId
    }));
  }

  return baseSaveDraft(clean);
}
