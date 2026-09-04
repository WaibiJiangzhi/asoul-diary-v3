import { existsSync, rmSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { stampServiceWorker } from './stamp-service-worker.mjs';

const outputDirectory = resolve('dist');
const entryFile = resolve(outputDirectory, 'client', 'index.html');
const vinextCli = resolve('node_modules', 'vinext', 'dist', 'cli.js');

rmSync(outputDirectory, { recursive: true, force: true });

const child = spawn(process.execPath, [vinextCli, 'build'], {
  env: { ...process.env, CF_PAGES: '1' },
});

let buildOutput = '';

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  buildOutput += text;
  process.stdout.write(text);
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString();
  buildOutput += text;
  process.stderr.write(text);
});

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on('close', (code) => {
  if (code === 0) {
    stampServiceWorker();
    return;
  }

  const outputIsComplete =
    buildOutput.includes('Build complete.') &&
    existsSync(entryFile) &&
    statSync(entryFile).size > 0;

  if (outputIsComplete) {
    stampServiceWorker();
    console.warn(
      'Static export completed; ignoring the known Vinext Windows shutdown error.',
    );
    return;
  }

  process.exitCode = code || 1;
});
