import {
  readdir,
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
/** @type {Array<[string, string, string[]]>} */
const members = [
  ['嘉然', 'jiaran', ['笔芯', '可爱捏', '哈哈哈', '画！', '比心', '你在干嘛']],
  ['贝拉', 'bella', ['加油', '贝极星', '哈哈哈', '送花', '不是吧', '突然出现']],
  ['乃琳', 'nailin', ['小狐狸', '打招呼', '哈哈哈', '干杯', '爱你']],
];
const slugs = ['classic', '2', 'brainwave', '2025', '2026', '2026-animated'];
const packs = [];
for (const [member, memberId, covers] of members) {
  const folders = (
    await readdir(resolve(source, member), { withFileTypes: true })
  )
    .filter((e) => e.isDirectory())
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  for (const folder of folders) {
    const order = parseInt(folder.name) - 1;
    const id = `${memberId}-${slugs[order]}`;
    const directory = resolve(source, member, folder.name);
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
      const animated = file.endsWith('.gif');
      const assetName = `${key}.${animated ? 'gif' : 'webp'}`;
      if (animated)
        await copyFile(resolve(directory, file), resolve(output, assetName));
      else
        await sharp(await readFile(resolve(directory, file)))
          .webp({ quality: 88 })
          .toFile(resolve(output, assetName));
      stickers.push({
        id: `${id}:${key}`,
        name,
        token,
        src: `/stickers/${id}/${assetName}`,
        animated,
      });
      if (name === covers[order])
        await sharp(await readFile(resolve(directory, file)))
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
      cover: `/stickers/${id}/cover.webp`,
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
