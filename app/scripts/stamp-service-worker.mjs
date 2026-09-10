import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const PLACEHOLDER = '__ASOUL_BUILD_VERSION__';

function releaseId() {
  const sourceRevision =
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.SOURCE_VERSION;
  if (sourceRevision) return sourceRevision.slice(0, 16);
  return new Date().toISOString().replace(/\D/g, '').slice(0, 14);
}

export function stampServiceWorker() {
  const serviceWorkerPath = resolve('dist', 'client', 'sw.js');
  const source = readFileSync(serviceWorkerPath, 'utf8');
  if (!source.includes(PLACEHOLDER)) {
    throw new Error(`Service worker is missing ${PLACEHOLDER}`);
  }

  const version = releaseId();
  const assets = readdirSync(resolve('dist', 'client'), { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => /\.(?:js|css)$/.test(file) && file !== 'sw.js')
    .map((file) => `/${file}`)
    .sort();
  writeFileSync(
    serviceWorkerPath,
    source
      .replaceAll(PLACEHOLDER, version)
      .replace('/* __ASOUL_BUILD_ASSETS__ */ []', JSON.stringify(assets)),
    'utf8',
  );
  process.stdout.write(`Stamped service worker release ${version}.\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) stampServiceWorker();
