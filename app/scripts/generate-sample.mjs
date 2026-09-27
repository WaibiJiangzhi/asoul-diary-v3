import { writeFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
const { outputFiles } = await build({
  stdin: {
    contents: "export { createDemoState } from './lib/defaults';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { createDemoState } = await import(
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
      photos: [],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Generated fixtures/life-sample-backup.json; the /preview page remains read-only to local data.',
);
