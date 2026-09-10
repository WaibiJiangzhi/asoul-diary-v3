import assert from 'node:assert/strict';
import { test } from 'node:test';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

async function load(path) {
  const { outputFiles } = await build({
    entryPoints: [fileURLToPath(new URL(path, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
  );
}
const {
  STICKER_PACKS,
  STICKERS,
  getSticker,
  splitStickerText,
  stickerTextToHtml,
} = await load('../lib/stickers.ts');

await test('all packs and covers exist, canonical tokens are unique, and chosen representatives remain available', async () => {
  assert.equal(STICKER_PACKS.length, 17);
  assert.equal(STICKERS.length, 370);
  assert.equal(new Set(STICKERS.map((s) => s.token)).size, 370);
  const covers = [
    '笔芯',
    '可爱捏',
    '哈哈哈',
    '画！',
    '比心',
    '你在干嘛',
    '加油',
    '贝极星',
    '哈哈哈',
    '送花',
    '不是吧',
    '突然出现',
    '小狐狸',
    '打招呼',
    '哈哈哈',
    '干杯',
    '爱你',
  ];
  for (const [index, pack] of STICKER_PACKS.entries())
    assert.ok(
      pack.stickers.some((s) => s.name === covers[index]),
      pack.name,
    );
  await Promise.all(
    [...STICKERS.map((s) => s.src), ...STICKER_PACKS.map((p) => p.cover)].map(
      (path) =>
        access(fileURLToPath(new URL(`../public${path}`, import.meta.url))),
    ),
  );
});

await test('mixed text round-trips with canonical Bilibili tokens and preserves unknown tokens', () => {
  const token = '[2026乃琳的酒馆_爱你]';
  const value = `今天${token}${token}\n[未知_表情] <script> & "`;
  const parts = splitStickerText(value);
  assert.equal(parts.map((p) => p.sticker?.token ?? p.text).join(''), value);
  assert.equal(parts.filter((p) => p.sticker).length, 2);
  assert.equal(getSticker('[2026乃琳的酒馆\\_爱你]').token, token);
  assert.ok(getSticker('[脑洞波系列主题装扮-乃琳_哈哈哈]'));
  const html = stickerTextToHtml(value);
  assert.equal((html.match(/<img /g) ?? []).length, 2);
  assert.ok(html.includes('&lt;script&gt; &amp; &quot;'));
  assert.ok(html.includes('[未知_表情]'));
  assert.ok(!html.includes('<script>'));
});

// Minimal node fixtures exercise the serializer without a browser dependency.
class Element {
  nodeType = 1;
  dataset = {};
  constructor(tagName, ...childNodes) {
    this.tagName = tagName;
    this.childNodes = childNodes;
  }
  get firstChild() {
    return this.childNodes[0];
  }
  getAttribute(name) {
    return this[name] ?? null;
  }
}
globalThis.HTMLElement = Element;
const text = (value) => ({ nodeType: 3, textContent: value });
const line = (...children) => new Element('DIV', ...children);
const br = () => new Element('BR');
const image = new Element('IMG');
image.dataset.sticker = '[2026乃琳的酒馆_爱你]';
const { readJournalContent } = await load('../lib/journal-content.ts');
await test('paragraphs, blank lines, inline images and the empty editor serialize without lost lines', () => {
  assert.equal(readJournalContent(line(br())), '');
  assert.equal(
    readJournalContent(line(line(br()), line(text('第二行')))),
    '\n第二行',
  );
  assert.equal(
    readJournalContent(
      line(text('开头'), line(br()), line(text('下一段'), image, text('末尾'))),
    ),
    '开头\n\n下一段[2026乃琳的酒馆_爱你]末尾',
  );
  assert.equal(
    readJournalContent(line(text('开头'), br(), br(), text('下一段'))),
    '开头\n\n下一段',
  );
});
