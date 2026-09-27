import { createContext, useContext, useEffect, useState } from 'react';
import { getPhotos } from '@/lib/db';
type PhotoUrl = { id: string; url: string; name: string };
export const PreviewPhotosContext = createContext<PhotoUrl[] | null>(null);

export function usePhotoUrls(ids: string[]) {
  const preview = useContext(PreviewPhotosContext);
  const key = ids.join('|');
  const [loaded, setLoaded] = useState<{ key: string; photos: PhotoUrl[] }>({
    key: '',
    photos: [],
  });
  useEffect(() => {
    if (preview || !key) return;
    let disposed = false;
    let urls: string[] = [];
    void getPhotos(key.split('|'))
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
  }, [key, preview]);
  if (preview)
    return ids.flatMap((id) => preview.filter((photo) => photo.id === id));
  return key && loaded.key === key ? loaded.photos : [];
}
