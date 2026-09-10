import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';

const { outputFiles } = await build({
  stdin: {
    contents:
      "export * from './lib/db'; export { createDefaultState } from './lib/defaults';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
let instance = 0;
async function page() {
  return import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}#${instance++}`
  );
}
globalThis.window = { setTimeout, clearTimeout };
globalThis.FileReader = class {
  readAsDataURL(blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onload();
    });
  }
};
const image = (name = 'photo.png') =>
  new File(['image contents'], name, { type: 'image/png' });
const diary = (body, photoIds = []) => ({
  date: '2026-09-10',
  mood: '',
  body,
  photoIds,
  taskSnapshots: [],
  growthSnapshots: [],
  createdAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
});
async function setup() {
  globalThis.indexedDB = new IDBFactory();
  const db = await page();
  const state = await db.loadState();
  const photos = await db.storePhotos([image()]);
  state.diaries = [diary('原来的日记', [photos[0].id])];
  await db.saveState(state);
  return { db, state, photos, backup: await db.createBackup(state) };
}

await test('invalid image decoding and malformed JSON leave both diaries and photos intact', async () => {
  const { db, state, photos, backup } = await setup();
  const variants = [null, { ...backup, state: { version: 4 } }];
  for (const invalid of [
    'data:image/png;base64,A',
    'data:image/png;base64,***',
    'data:image/png;base64,',
  ]) {
    const candidate = structuredClone(backup);
    candidate.photos[0].dataUrl = invalid;
    variants.push(candidate);
  }
  const badText = structuredClone(backup);
  badText.state.diaries[0].body = 123;
  variants.push(badText);
  const missing = structuredClone(backup);
  missing.photos = [];
  variants.push(missing);
  const duplicate = structuredClone(backup);
  duplicate.photos.push(duplicate.photos[0]);
  variants.push(duplicate);
  for (const candidate of variants) {
    await assert.rejects(db.restoreBackup(candidate));
    assert.deepEqual(await db.loadState(), state);
    assert.equal((await db.getPhotos([photos[0].id])).length, 1);
  }
});

await test('a synchronous write failure after clear rolls back the entire replacement', async () => {
  const { db, state, photos, backup } = await setup();
  const incoming = structuredClone(backup);
  incoming.state.diaries[0].body = '新日记';
  // Keep the original method for apply/restore during fault injection.
  // eslint-disable-next-line typescript/unbound-method
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === 'photos')
      throw new DOMException('forced clone failure', 'DataCloneError');
    return originalPut.apply(this, args);
  };
  try {
    await assert.rejects(db.restoreBackup(incoming), {
      name: 'DataCloneError',
    });
  } finally {
    IDBObjectStore.prototype.put = originalPut;
  }
  assert.deepEqual(await db.loadState(), state);
  assert.equal((await db.getPhotos([photos[0].id])).length, 1);
});

await test('two pages cannot silently overwrite each other, including photo removal', async () => {
  const { db: first, state, photos } = await setup();
  const second = await page();
  const stale = await second.loadState();
  const newer = structuredClone(state);
  newer.diaries[0].body = '第一页面刚写的新内容';
  await first.saveState(newer);
  stale.diaries[0].body = '第二页未保存的内容';
  await assert.rejects(second.saveState(stale), {
    name: 'StorageConflictError',
  });
  await assert.rejects(second.deletePhotos([photos[0].id]), {
    name: 'StorageConflictError',
  });
  await assert.rejects(second.clearAllData(), { name: 'StorageConflictError' });
  assert.deepEqual(await first.loadState(), newer);
  assert.equal((await first.getPhotos([photos[0].id])).length, 1);
  assert.equal(
    (await second.createBackup(stale)).state.diaries[0].body,
    '第二页未保存的内容',
  );
});

await test('own queued saves stay ordered; queued pre-import saves cannot undo the import', async () => {
  const { db, state, backup } = await setup();
  const a = structuredClone(state);
  const b = structuredClone(state);
  a.diaries[0].body = '第一次';
  b.diaries[0].body = '第二次';
  await Promise.all([db.saveState(a), db.saveState(b)]);
  assert.equal((await db.loadState()).diaries[0].body, '第二次');
  const importing = db.restoreBackup(backup);
  const staleSaving = db.saveState(b);
  const result = await Promise.allSettled([importing, staleSaving]);
  assert.equal(result[0].status, 'fulfilled');
  assert.equal(result[1].status, 'rejected');
  assert.equal((await db.loadState()).diaries[0].body, '原来的日记');
});

await test('failed photo batches leave no orphan blobs, and the next batch still succeeds', async () => {
  const { db, state } = await setup();
  await assert.rejects(
    db.storePhotos([
      image(),
      new File(['bad'], 'note.txt', { type: 'text/plain' }),
    ]),
  );
  assert.equal((await db.createBackup(state)).photos.length, 1);
  // eslint-disable-next-line typescript/unbound-method
  const originalPut = IDBObjectStore.prototype.put;
  let added = 0;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === 'photos' && ++added === 2)
      throw new DOMException('full', 'QuotaExceededError');
    return originalPut.apply(this, args);
  };
  try {
    await assert.rejects(db.storePhotos([image(), image()]));
  } finally {
    IDBObjectStore.prototype.put = originalPut;
  }
  assert.equal((await db.createBackup(state)).photos.length, 1);
  await db.storePhotos([image(), image()]);
  assert.equal((await db.createBackup(state)).photos.length, 3);
});

await test('photo removal commits atomically with diary references and survives a failed save', async () => {
  const { db, state, photos } = await setup();
  await db.deletePhotos([photos[0].id]);
  await db.saveState(state); // An earlier pending save still references the photo.
  assert.equal((await db.getPhotos([photos[0].id])).length, 1);
  const removed = { ...state, diaries: [diary('照片已移除')] };
  // eslint-disable-next-line typescript/unbound-method
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () {
    throw new DOMException('full', 'QuotaExceededError');
  };
  try {
    await assert.rejects(db.saveState(removed));
  } finally {
    IDBObjectStore.prototype.put = originalPut;
  }
  assert.equal((await db.getPhotos([photos[0].id])).length, 1);
  await db.saveState(removed);
  assert.equal((await db.getPhotos([photos[0].id])).length, 0);
  assert.deepEqual((await db.loadState()).diaries[0].photoIds, []);
});

await test('the complete sample backup round-trips with every diary and embedded photo', async () => {
  const { db } = await setup();
  const fixture = JSON.parse(
    readFileSync(
      new URL('../fixtures/two-years-sample-backup.json', import.meta.url),
      'utf8',
    ),
  );
  const restored = await db.restoreBackup(fixture);
  assert.equal(restored.diaries.length, fixture.state.diaries.length);
  assert.equal(
    (await db.loadState()).memories.length,
    fixture.state.memories.length,
  );
  const exported = await db.createBackup(restored);
  assert.deepEqual(
    exported.photos.sort((a, b) => a.id.localeCompare(b.id)),
    fixture.photos.sort((a, b) => a.id.localeCompare(b.id)),
  );
  await db.restoreBackup(exported);
  assert.deepEqual(await db.loadState(), restored);
});
