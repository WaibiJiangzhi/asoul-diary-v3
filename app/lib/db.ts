import { createDefaultState, createId, normalizeState } from './defaults';
import type { AppState, DiaryBackup, StoredPhoto } from './types';

const DB_NAME = 'asoul-diary-v3';
const DB_VERSION = 1;
const STATE_KEY = 'main';
const DB_OPEN_TIMEOUT_MS = 4000;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持本地数据库'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('打开本地数据库超时'));
    }, DB_OPEN_TIMEOUT_MS);

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(error);
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('state'))
        database.createObjectStore('state');
      if (!database.objectStoreNames.contains('photos')) {
        database.createObjectStore('photos', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      resolve(request.result);
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error('本地数据库正被另一个页面占用'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadState(): Promise<AppState> {
  const database = await openDatabase();
  const transaction = database.transaction('state', 'readonly');
  const stored = await requestResult(
    transaction.objectStore('state').get(STATE_KEY),
  );
  database.close();
  if (!stored || (stored as AppState).version !== 4)
    return createDefaultState();
  return normalizeState(stored as AppState);
}

export async function saveState(state: AppState): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction('state', 'readwrite');
  transaction.objectStore('state').put(state, STATE_KEY);
  await transactionDone(transaction);
  database.close();
}

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('只能添加图片');
  if (typeof createImageBitmap === 'undefined') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const largestSide = Math.max(bitmap.width, bitmap.height);
    if (file.size < 450_000 && largestSide <= 1600) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, 1600 / largestSide);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext('2d')
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/webp', 0.82);
    });
  } catch {
    return file;
  }
}

export async function storePhoto(file: File): Promise<StoredPhoto> {
  const photo: StoredPhoto = {
    id: createId('photo'),
    blob: await compressImage(file),
    name: file.name,
    createdAt: new Date().toISOString(),
  };
  const database = await openDatabase();
  const transaction = database.transaction('photos', 'readwrite');
  transaction.objectStore('photos').put(photo);
  await transactionDone(transaction);
  database.close();
  return photo;
}

export async function getPhotos(ids: string[]): Promise<StoredPhoto[]> {
  if (!ids.length) return [];
  const database = await openDatabase();
  const transaction = database.transaction('photos', 'readonly');
  const store = transaction.objectStore('photos');
  const photos = await Promise.all(
    ids.map((id) => requestResult(store.get(id))),
  );
  database.close();
  return photos.filter(Boolean) as StoredPhoto[];
}

export async function deletePhotos(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const database = await openDatabase();
  const transaction = database.transaction('photos', 'readwrite');
  const store = transaction.objectStore('photos');
  ids.forEach((id) => store.delete(id));
  await transactionDone(transaction);
  database.close();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('\u56fe\u7247\u8f6c\u6362\u5931\u8d25'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(',');
  const mime =
    /data:(.*?);base64/.exec(header)?.[1] ?? 'application/octet-stream';
  const bytes = Uint8Array.from(atob(body), (character) =>
    character.charCodeAt(0),
  );
  return new Blob([bytes], { type: mime });
}

export async function createBackup(state: AppState): Promise<DiaryBackup> {
  const database = await openDatabase();
  const transaction = database.transaction('photos', 'readonly');
  const photos = (await requestResult(
    transaction.objectStore('photos').getAll(),
  )) as StoredPhoto[];
  database.close();
  return {
    product: 'asoul-diary-v3',
    exportedAt: new Date().toISOString(),
    state,
    photos: await Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        dataUrl: await blobToDataUrl(photo.blob),
        name: photo.name,
        createdAt: photo.createdAt,
      })),
    ),
  };
}

export async function restoreBackup(backup: DiaryBackup): Promise<AppState> {
  if (backup.product !== 'asoul-diary-v3' || backup.state?.version !== 4) {
    throw new Error('这不是 Asoul 一个魂生活日记 v3 备份');
  }
  const restored = normalizeState(backup.state);
  const database = await openDatabase();
  const transaction = database.transaction(['state', 'photos'], 'readwrite');
  const stateStore = transaction.objectStore('state');
  const photoStore = transaction.objectStore('photos');
  stateStore.clear();
  photoStore.clear();
  stateStore.put(restored, STATE_KEY);
  for (const photo of backup.photos ?? []) {
    photoStore.put({
      id: photo.id,
      blob: dataUrlToBlob(photo.dataUrl),
      name: photo.name,
      createdAt: photo.createdAt,
    } satisfies StoredPhoto);
  }
  await transactionDone(transaction);
  database.close();
  return restored;
}

export async function clearAllData(): Promise<AppState> {
  const fresh = createDefaultState();
  const database = await openDatabase();
  const transaction = database.transaction(['state', 'photos'], 'readwrite');
  transaction.objectStore('state').clear();
  transaction.objectStore('photos').clear();
  transaction.objectStore('state').put(fresh, STATE_KEY);
  await transactionDone(transaction);
  database.close();
  return fresh;
}
