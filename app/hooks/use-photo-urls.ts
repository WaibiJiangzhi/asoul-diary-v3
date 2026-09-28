import { createContext, useContext, useEffect, useState } from 'react';
import { dataGeneration, getPhotos } from '@/lib/db';
type PhotoUrl = { id: string; url: string; name: string };
export const PreviewPhotosContext = createContext<PhotoUrl[] | null>(null);

export function usePhotoUrls(ids: string[]) {
  const preview = useContext(PreviewPhotosContext);
  const idsKey = JSON.stringify(ids);
  const generation = dataGeneration();
  const key = generation + ':' + idsKey;
  const [loaded, setLoaded] = useState<{ key: string; photos: PhotoUrl[] }>({
    key: '',
    photos: [],
  });
  useEffect(() => {
    if (preview || idsKey === '[]') return;
    let disposed = false;
    let urls: string[] = [];
    void getPhotos(JSON.parse(idsKey) as string[])
      .then((items) => {
        if (disposed) return;
        const photos = items.map((p) => ({
          id: p.id,
          url: URL.createObjectURL(p.blob),
          name: p.name,
        }));
        urls = photos.map((p) => p.url);
        setLoaded({ key, photos });
      })
      .catch(() => {
        if (!disposed) setLoaded({ key, photos: [] });
      });
    return () => {
      disposed = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [key, idsKey, preview]);
  if (preview)
    return ids.flatMap((id) => preview.filter((photo) => photo.id === id));
  return ids.length && loaded.key === key ? loaded.photos : [];
}
