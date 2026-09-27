import { createDefaultState, createId, normalizeState } from './defaults';
import type { AppState, DiaryBackup, StoredPhoto } from './types';
import { validateBackup, validateState } from './backup-validation';
import { allPhotoIds } from './life';

const DB_NAME = 'asoul-life-v3-preview';
const DB_VERSION = 1;
const STATE_KEY = 'main';
const REVISION_KEY = 'revision';
const DB_OPEN_TIMEOUT_MS = 4000;
let expectedRevision: string | null | undefined;
let replacementGeneration = 0;
let writes: Promise<unknown> = Promise.resolve();
const pendingPhotoDeletes = new Set<string>();

export class StorageConflictError extends Error {
  constructor() {
    super('另一个页面已更新记录。本页修改尚未保存，请先导出备份，再重新打开。');
    this.name = 'StorageConflictError';
  }
}

export function dataGeneration() {
  return replacementGeneration;
}

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writes.then(operation, operation);
  writes = next.catch(() => {});
  return next;
}

/** Check and write in one transaction so another page cannot overwrite newer data. */
async function writeTransaction(
  apply: (transaction: IDBTransaction) => void,
  { photos = false, changesState = false, replace = false } = {},
) {
  const database = await openDatabase();
  const transaction = database.transaction(
    photos ? ['state', 'photos'] : ['state'],
    'readwrite',
  );
  const completed = transactionDone(transaction);
  let failure: unknown;
  const nextRevision = createId('revision');
  const store = transaction.objectStore('state');
  const request = store.get(REVISION_KEY);
  request.onsuccess = () => {
    try {
      if (
        !(replace && expectedRevision === undefined) &&
        (expectedRevision === undefined ||
          (request.result ?? null) !== expectedRevision)
      )
        throw new StorageConflictError();
      apply(transaction);
      if (changesState) store.put(nextRevision, REVISION_KEY);
    } catch (error) {
      failure = error;
      transaction.abort();
    }
  };
  try {
    await completed;
    if (changesState) expectedRevision = nextRevision;
    if (replace) {
      replacementGeneration++;
      pendingPhotoDeletes.clear();
    }
  } catch (error) {
    throw failure ?? error;
  } finally {
    database.close();
  }
}

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
  const store = transaction.objectStore('state');
  const [stored, revision] = await Promise.all([
    requestResult(store.get(STATE_KEY)),
    requestResult(store.get(REVISION_KEY)),
  ]).finally(() => database.close());
  expectedRevision = (revision as string | undefined) ?? null;
  if (!stored) return createDefaultState();
  validateState(stored);
  return normalizeState(stored as AppState);
}

export function saveState(state: AppState): Promise<void> {
  const generation = replacementGeneration;
  return queueWrite(async () => {
    if (generation !== replacementGeneration)
      throw new Error('记录已替换，旧保存已取消');
    const referenced = new Set(allPhotoIds(state));
    const removed = [...pendingPhotoDeletes].filter(
      (id) => !referenced.has(id),
    );
    await writeTransaction(
      (transaction) => {
        transaction.objectStore('state').put(state, STATE_KEY);
        if (removed.length)
          removed.forEach((id) => transaction.objectStore('photos').delete(id));
      },
      { changesState: true, photos: removed.length > 0 },
    );
    removed.forEach((id) => pendingPhotoDeletes.delete(id));
  });
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

export async function storePhotos(files: File[]): Promise<StoredPhoto[]> {
  const generation = replacementGeneration;
  const photos = await Promise.all(
    files.map(async (file) => ({
      id: createId('photo'),
      blob: await compressImage(file),
      name: file.name,
      createdAt: new Date().toISOString(),
    })),
  );
  await queueWrite(async () => {
    if (generation !== replacementGeneration)
      throw new Error('记录已替换，请重新添加照片');
    await writeTransaction(
      (transaction) => {
        const store = transaction.objectStore('photos');
        photos.forEach((photo) => store.put(photo));
      },
      { photos: true },
    );
  });
  return photos;
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
  await queueWrite(async () => {
    await writeTransaction(() => {});
    // Remove blobs in the same commit that removes their record references.
    // A failed autosave must leave the previously saved photos intact.
    ids.forEach((id) => pendingPhotoDeletes.add(id));
  });
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
  const match = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(
    dataUrl,
  );
  if (!match || !match[2])
    throw new Error('备份中的图片数据无效，原有记录未替换');
  const [, mime, body] = match;
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
  const referenced = new Set(allPhotoIds(state));
  const included = photos.filter((photo) => referenced.has(photo.id));
  if (included.length !== referenced.size)
    throw new Error('有照片暂时无法读取，请稍后重新备份');
  return {
    product: 'asoul-life-v3',
    exportedAt: new Date().toISOString(),
    state,
    photos: await Promise.all(
      included.map(async (photo) => ({
        id: photo.id,
        dataUrl: await blobToDataUrl(photo.blob),
        name: photo.name,
        createdAt: photo.createdAt,
      })),
    ),
  };
}

export async function restoreBackup(backup: DiaryBackup): Promise<AppState> {
  validateBackup(backup);
  const restored = normalizeState(backup.state);
  // Decode before opening the replacing transaction. Any later synchronous
  // failure is explicitly aborted by writeTransaction.
  const photos = (backup.photos ?? []).map((photo) => ({
    id: photo.id,
    blob: dataUrlToBlob(photo.dataUrl),
    name: photo.name,
    createdAt: photo.createdAt,
  }));
  const ids = new Set(photos.map((photo) => photo.id));
  if (
    ids.size !== photos.length ||
    photos.some((photo) => !photo.id) ||
    allPhotoIds(restored).some((id) => !ids.has(id))
  )
    throw new Error('备份中的照片缺失或重复，原有记录未替换');
  await queueWrite(() =>
    writeTransaction(
      (transaction) => {
        const stateStore = transaction.objectStore('state');
        const photoStore = transaction.objectStore('photos');
        stateStore.clear();
        photoStore.clear();
        stateStore.put(restored, STATE_KEY);
        photos.forEach((photo) => photoStore.put(photo));
      },
      { photos: true, changesState: true, replace: true },
    ),
  );
  return restored;
}

export async function clearAllData(): Promise<AppState> {
  const fresh = createDefaultState();
  await queueWrite(() =>
    writeTransaction(
      (transaction) => {
        transaction.objectStore('state').clear();
        transaction.objectStore('photos').clear();
        transaction.objectStore('state').put(fresh, STATE_KEY);
      },
      { photos: true, changesState: true, replace: true },
    ),
  );
  return fresh;
}
