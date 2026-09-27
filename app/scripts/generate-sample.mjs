import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
const { outputFiles } = await build({
  stdin: {
    contents:
      "export { createDemoState } from './lib/defaults'; export { DEMO_PHOTOS } from './lib/demo-photos';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { createDemoState, DEMO_PHOTOS } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(outputFiles[0].text).toString('base64')
);
await mkdir('fixtures', { recursive: true });
await writeFile(
  'fixtures/life-sample-backup.json',
  JSON.stringify(
    {
      product: 'asoul-life-v3',
      exportedAt: new Date().toISOString(),
      state: createDemoState(),
      photos: await Promise.all(
        DEMO_PHOTOS.map(async ({ id, name, url }) => ({
          id,
          name,
          createdAt: new Date().toISOString(),
          dataUrl:
            'data:image/svg+xml;base64,' +
            (await readFile('public' + url)).toString('base64'),
        })),
      ),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Generated fixtures/life-sample-backup.json; the /preview page remains read-only to local data.',
);
