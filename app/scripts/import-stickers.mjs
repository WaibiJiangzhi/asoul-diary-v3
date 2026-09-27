import {
  readdir,
  access,
  readFile,
  mkdir,
  copyFile,
  writeFile,
} from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(app, '../本地素材（不上传）/姐仨表情包合集');
// Optional transparent replacements are matched by token, never by folder order.
const replacements = new Map();
async function indexReplacements(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await indexReplacements(path);
    else if (/\.(png|webp|gif)$/i.test(entry.name)) {
      const token = entry.name.replace(/\.[^.]+$/, '').replace(/^\[\s+/, '[');
      if (replacements.has(token))
        throw new Error('Duplicate replacement: ' + token);
      replacements.set(token, path);
    }
  }
}
const replacementRoot = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(app, '../本地素材（不上传）/gif');
try {
  await access(replacementRoot);
  await indexReplacements(replacementRoot);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
let replaced = 0;
/** @type {Array<[string, string, string[]]>} */
const members = [
  ['嘉然', 'jiaran', ['笔芯', '可爱捏', '哈哈哈', '画！', '比心', '你在干嘛']],
  ['贝拉', 'bella', ['加油', '贝极星', '哈哈哈', '送花', '不是吧', '摸脑袋']],
  ['乃琳', 'nailin', ['小狐狸', '打招呼', '哈哈哈', '干杯', '爱你', '爱你']],
];
const slugs = ['classic', '2', 'brainwave', '2025', '2026', '2026-animated'];
const packs = [];
for (const [member, memberId, covers] of members) {
  const folders = (
    await readdir(resolve(source, member), { withFileTypes: true })
  )
    .filter((e) => e.isDirectory())
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  if (
    memberId === 'nailin' &&
    !folders.some((folder) => parseInt(folder.name) === 6)
  ) {
    folders.push({
      name: '6-2026乃琳的酒馆动态表情包',
      source: resolve(replacementRoot, '乃琳/2026乃琳的酒馆动态表情包'),
    });
  }
  for (const folder of folders) {
    const order = parseInt(folder.name) - 1;
    const id = `${memberId}-${slugs[order]}`;
    const directory = folder.source ?? resolve(source, member, folder.name);
    const output = resolve(app, 'public/stickers', id);
    await mkdir(output, { recursive: true });
    const files = (await readdir(directory))
      .filter((f) => /\.(jpg|png|webp|gif)$/i.test(f))
      .sort();
    const stickers = [];
    for (const file of files) {
      const token = file.replace(/\.[^.]+$/, '');
      const name = token.slice(token.lastIndexOf('_') + 1, -1);
      const key = createHash('sha256').update(token).digest('hex').slice(0, 12);
      const replacement = replacements.get(token.replace(/^\[\s+/, '['));
      const input = replacement ?? resolve(directory, file);
      if (replacement) replaced++;
      const bytes = await readFile(input);
      const version = createHash('sha256')
        .update(bytes)
        .digest('hex')
        .slice(0, 10);
      const animated = input.toLowerCase().endsWith('.gif');
      const assetName = `${key}.${animated ? 'gif' : 'webp'}`;
      if (animated) await copyFile(input, resolve(output, assetName));
      else
        await sharp(bytes)
          .webp({ quality: 88 })
          .toFile(resolve(output, assetName));
      stickers.push({
        id: `${id}:${key}`,
        name,
        token,
        src: `/stickers/${id}/${assetName}?v=${version}`,
        animated,
      });
      if (name === covers[order])
        await sharp(bytes)
          .resize(80, 80, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 90 })
          .toFile(resolve(output, 'cover.webp'));
    }
    if (!stickers.some((s) => s.name === covers[order]))
      throw new Error(`Missing chosen cover: ${id} ${covers[order]}`);
    packs.push({
      id,
      member,
      name: folder.name.replace(/^\d+-_?/, ''),
      cover: `/stickers/${id}/cover.webp?v=${createHash('sha256')
        .update(await readFile(resolve(output, 'cover.webp')))
        .digest('hex')
        .slice(0, 10)}`,
      stickers,
    });
  }
}
await writeFile(
  resolve(app, 'lib/sticker-catalog.json'),
  JSON.stringify(packs, null, 2) + '\n',
);
console.log(
  `Imported ${packs.length} packs / ${packs.reduce((n, p) => n + p.stickers.length, 0)} stickers.`,
);

if (replacements.size)
  console.log(
    `Matched ${replaced}/${replacements.size} transparent replacements.`,
  );
