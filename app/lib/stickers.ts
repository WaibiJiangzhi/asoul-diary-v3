import catalog from './sticker-catalog.json';

export interface Sticker {
  id: string;
  name: string;
  token: string;
  src: string;
  animated: boolean;
}
export const STICKER_PACKS = catalog;
export const STICKERS: Sticker[] = catalog.flatMap((pack) => pack.stickers);
const normalizeToken = (value: string) =>
  value.replaceAll('\\_', '_').replace(/^\[\s+/, '[');
const byToken = new Map(
  STICKERS.map((sticker) => [normalizeToken(sticker.token), sticker]),
);
export const getSticker = (value: string) => byToken.get(normalizeToken(value));

export function splitStickerText(
  text: string,
): (
  | { text: string; sticker?: undefined }
  | { sticker: Sticker; text?: undefined }
)[] {
  const parts: (
    | { text: string; sticker?: undefined }
    | { sticker: Sticker; text?: undefined }
  )[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/\[[^\]\r\n]+\]/g)) {
    const sticker = getSticker(match[0]);
    if (!sticker) continue;
    if (match.index > cursor)
      parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ sticker });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
/** Only trusted catalog images become markup; pasted HTML is never accepted. */
export function stickerTextToHtml(text: string) {
  return splitStickerText(text)
    .map((part) =>
      part.sticker
        ? `<img class="inline-sticker" data-sticker="${escapeHtml(part.sticker.token)}" src="${part.sticker.src}" alt="${escapeHtml(part.sticker.token)}" draggable="false" contenteditable="false">`
        : escapeHtml(part.text).replaceAll('\n', '<br>'),
    )
    .join('');
}
