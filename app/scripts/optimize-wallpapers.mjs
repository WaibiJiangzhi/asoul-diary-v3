import { readdir } from 'node:fs/promises';
import { extname, join, parse } from 'node:path';
import sharp from 'sharp';

const wallpaperDirectory = join(process.cwd(), 'public', 'wallpapers');
const files = await readdir(wallpaperDirectory);

for (const file of files) {
  const extension = extname(file).toLowerCase();
  if (extension !== '.jpg' && extension !== '.jpeg' && extension !== '.png') continue;
  const source = join(wallpaperDirectory, file);
  const destination = join(wallpaperDirectory, `${parse(file).name}.webp`);
  await sharp(source)
    .rotate()
    .resize({ width: 1440, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, smartSubsample: true })
    .toFile(destination);
}
