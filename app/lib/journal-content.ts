import { getSticker } from './stickers';

/** Serialize text, line breaks and catalog stickers; never persist editable HTML. */
export function readJournalContent(root: Node): string {
  if (root.nodeType === 3) return root.textContent ?? '';
  if (root instanceof HTMLElement) {
    if (root.tagName === 'IMG')
      return (
        getSticker(root.dataset.sticker ?? '')?.token ??
        root.getAttribute('alt') ??
        ''
      );
    if (root.tagName === 'BR') return '\n';
  }
  const isBlock = (node: Node) =>
    node instanceof HTMLElement && /^(DIV|P|LI)$/.test(node.tagName);
  const isBreak = (node: Node) =>
    node instanceof HTMLElement && node.tagName === 'BR';
  const children = Array.from(root.childNodes);
  // Browsers put a placeholder BR in an otherwise empty editable block.
  if (isBlock(root) && children.length === 1 && isBreak(children[0])) return '';
  let text = '';
  for (const [index, child] of children.entries()) {
    const previous = children[index - 1];
    if (
      previous &&
      ((isBlock(child) && !isBreak(previous)) ||
        (isBlock(previous) && !isBlock(child)))
    )
      text += '\n';
    text += readJournalContent(child);
  }
  return text.replaceAll('\u00a0', ' ');
}

export type JournalSelection = { anchor: number; focus: number };

/** Offsets count the saved text, including the complete token for an image. */
export function journalSelection(root: HTMLElement): JournalSelection {
  const selected = window.getSelection();
  const offset = (node: Node | null, position: number) => {
    if (!node || !root.contains(node)) return readJournalContent(root).length;
    const prefix = document.createRange();
    prefix.selectNodeContents(root);
    prefix.setEnd(node, position);
    return readJournalContent(prefix.cloneContents()).length;
  };
  return {
    anchor: offset(selected?.anchorNode ?? null, selected?.anchorOffset ?? 0),
    focus: offset(selected?.focusNode ?? null, selected?.focusOffset ?? 0),
  };
}

/** Restore against canonical markup (text, BR and atomic IMG nodes only). */
export function restoreJournalSelection(
  root: HTMLElement,
  saved: JournalSelection,
) {
  const point = (offset: number): [Node, number] => {
    let remaining = Math.max(0, offset);
    for (const [index, node] of Array.from(root.childNodes).entries()) {
      const length = readJournalContent(node).length;
      if (node.nodeType === 3 && remaining <= length) return [node, remaining];
      if (remaining < length) return [root, index];
      remaining -= length;
    }
    return [root, root.childNodes.length];
  };
  const [anchorNode, anchorOffset] = point(saved.anchor);
  const [focusNode, focusOffset] = point(saved.focus);
  window
    .getSelection()
    ?.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
}
