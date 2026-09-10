import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
  new URL('../public/sw.js', import.meta.url),
  'utf8',
);
function worker() {
  const handlers = {};
  const entries = new Map();
  const installed = [];
  const key = (request) =>
    typeof request === 'string' ? request : request.url;
  const cache = {
    addAll: async (urls) => installed.push(...urls),
    put: async (request, response) => entries.set(key(request), response),
    match: async (request) => entries.get(key(request))?.clone(),
  };
  let network = async () => new Response('online');
  runInNewContext(
    source.replace(
      '/* __ASOUL_BUILD_ASSETS__ */ []',
      '["/assets/app.js", "/assets/app.css"]',
    ),
    {
      self: {
        location: { origin: 'https://diary.test' },
        addEventListener: (name, fn) => {
          handlers[name] = fn;
        },
      },
      caches: { open: async () => cache, match: cache.match },
      URL,
      fetch: (request) => network(request),
    },
  );
  return {
    entries,
    installed,
    setNetwork: (fn) => {
      network = fn;
    },
    install: async () => {
      /** @type {Promise<void> | undefined} */
      let pending;
      handlers.install({
        waitUntil: (promise) => {
          pending = promise;
        },
      });
      await pending;
    },
    navigate: async (path = '/') => {
      const lifetime = [];
      /** @type {Promise<Response> | undefined} */
      let response;
      handlers.fetch({
        request: {
          method: 'GET',
          mode: 'navigate',
          url: `https://diary.test${path}`,
        },
        respondWith: (promise) => {
          response = promise;
        },
        waitUntil: (promise) => lifetime.push(promise),
      });
      const result = await response;
      await Promise.all(lifetime);
      return result;
    },
  };
}

await test('first installation precaches the built application scripts and styles', async () => {
  const sw = worker();
  await sw.install();
  assert.ok(sw.installed.includes('/'));
  assert.ok(sw.installed.includes('/assets/app.js'));
  assert.ok(sw.installed.includes('/assets/app.css'));
});
await test('server errors and failed navigation keep the working offline shell', async () => {
  const sw = worker();
  await sw.navigate();
  sw.setNetwork(
    async () => new Response('server unavailable', { status: 503 }),
  );
  assert.equal(await (await sw.navigate()).text(), 'online');
  assert.equal(await sw.entries.get('/').clone().text(), 'online');
  sw.setNetwork(async () => {
    throw new TypeError('offline');
  });
  assert.equal(await (await sw.navigate()).clone().text(), 'online');
});
await test('other routes and redirected pages cannot replace the app homepage', async () => {
  const sw = worker();
  await sw.navigate();
  sw.setNetwork(async () => new Response('other page'));
  await sw.navigate('/missing');
  sw.setNetwork(async () => {
    const response = new Response('redirect destination');
    Object.defineProperty(response, 'redirected', { value: true });
    return response;
  });
  await sw.navigate();
  assert.equal(await sw.entries.get('/').text(), 'online');
});
