'use client';

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { stickerTextToHtml } from '@/lib/stickers';
import {
  journalSelection,
  readJournalContent,
  restoreJournalSelection,
  type JournalSelection,
} from '@/lib/journal-content';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { StickerPanel } from './sticker-picker';

export function JournalEditor({
  value,
  onChange,
  portalTarget,
}: {
  value: string;
  onChange: (text: string) => void;
  portalTarget?: HTMLElement | null;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const emitted = useRef<string | null>(null);
  const composing = useRef(false);
  const history = useRef<{ text: string; cursor: JournalSelection }[]>([]);
  const historyIndex = useRef(0);
  const [panel, setPanel] = useState(false);
  const [focused, setFocused] = useState(false);
  const [notice, setNotice] = useState('');
  const viewport = useVisualViewport();
  function revealCaret() {
    const bounds = selection.current?.getBoundingClientRect();
    const top = dock.current?.getBoundingClientRect().top;
    if (bounds?.height && top !== undefined && bounds.bottom > top - 24)
      (editor.current?.closest('.drawer-inner') ?? window).scrollBy({
        top: bounds.bottom - top + 24,
      });
  }
  function saveSelection() {
    const current = window.getSelection();
    if (
      current?.rangeCount &&
      editor.current?.contains(current.anchorNode) &&
      editor.current.contains(current.focusNode)
    ) {
      selection.current = current.getRangeAt(0).cloneRange();
      const item = history.current[historyIndex.current];
      if (item && item.text === readJournalContent(editor.current))
        item.cursor = journalSelection(editor.current);
    }
  }
  function restoreSelection(keyboard = true) {
    const root = editor.current;
    if (!root) return;
    root.inputMode = keyboard ? 'text' : 'none';
    root.focus({ preventScroll: true });
    const current = window.getSelection();
    const range = selection.current;
    current?.removeAllRanges();
    if (
      range &&
      root.contains(range.startContainer) &&
      root.contains(range.endContainer)
    )
      current?.addRange(range);
    else {
      const next = document.createRange();
      next.selectNodeContents(root);
      next.collapse(false);
      current?.addRange(next);
    }
  }
  function emit() {
    if (!editor.current || composing.current) return;
    const text = readJournalContent(editor.current);
    const cursor = journalSelection(editor.current);
    if (history.current[historyIndex.current]?.text !== text) {
      history.current = [
        ...history.current.slice(0, historyIndex.current + 1),
        { text, cursor },
      ].slice(-100);
      historyIndex.current = history.current.length - 1;
    }
    emitted.current = text;
    onChange(text);
    saveSelection();
  }
  function insert(text: string, keyboard = true) {
    restoreSelection(keyboard);
    saveSelection();
    const current = readJournalContent(editor.current!);
    const selected = window.getSelection();
    const replaced = selected?.rangeCount
      ? readJournalContent(selected.getRangeAt(0).cloneContents()).length
      : 0;
    if (current.length - replaced + text.length > 12000) {
      setNotice('这页已接近 12000 字，先留住已经写下的内容');
      return;
    }
    const range = selected?.getRangeAt(0);
    if (!range) return;
    const fragment = range.createContextualFragment(stickerTextToHtml(text));
    const last = fragment.lastChild;
    range.deleteContents();
    range.insertNode(fragment);
    if (last) range.setStartAfter(last);
    range.collapse(true);
    selected?.removeAllRanges();
    selected?.addRange(range);
    setNotice('');
    emit();
    if (!keyboard) editor.current?.blur();
    requestAnimationFrame(revealCaret);
  }
  function copy(event: ClipboardEvent<HTMLDivElement>, cut = false) {
    const current = window.getSelection();
    if (!current?.rangeCount || current.isCollapsed) return;
    event.preventDefault();
    event.clipboardData.setData(
      'text/plain',
      readJournalContent(current.getRangeAt(0).cloneContents()),
    );
    if (cut) {
      saveSelection();
      current.getRangeAt(0).deleteContents();
      emit();
    }
  }
  function undo(direction: -1 | 1) {
    const next = historyIndex.current + direction;
    const snapshot = history.current[next];
    if (!snapshot || !editor.current) return;
    historyIndex.current = next;
    editor.current.innerHTML = stickerTextToHtml(snapshot.text);
    emitted.current = snapshot.text;
    onChange(snapshot.text);
    restoreJournalSelection(editor.current, snapshot.cursor);
    saveSelection();
  }
  function openPanel() {
    saveSelection();
    editor.current?.blur();
    setPanel(true);
  }
  const beforeInput = useEffectEvent((event: InputEvent) => {
    saveSelection();
    if (
      event.inputType === 'historyUndo' ||
      event.inputType === 'historyRedo'
    ) {
      event.preventDefault();
      undo(event.inputType === 'historyUndo' ? -1 : 1);
    }
    if (event.inputType.startsWith('format')) event.preventDefault();
    if (
      !event.isComposing &&
      event.data &&
      editor.current &&
      readJournalContent(editor.current).length + event.data.length > 12000 &&
      window.getSelection()?.isCollapsed
    )
      event.preventDefault();
  });
  useEffect(() => {
    const root = editor.current;
    if (!root) return;
    const listener = (event: InputEvent) => beforeInput(event);
    root.addEventListener('beforeinput', listener);
    return () => root.removeEventListener('beforeinput', listener);
  }, []);
  useEffect(() => {
    if (!panel && !viewport.bottom) return;
    const frame = requestAnimationFrame(revealCaret);
    return () => cancelAnimationFrame(frame);
  }, [panel, viewport.bottom, viewport.height]);
  useEffect(() => {
    if (editor.current && value !== emitted.current && !composing.current) {
      editor.current.innerHTML = stickerTextToHtml(value);
      emitted.current = value;
      history.current = [
        { text: value, cursor: { anchor: value.length, focus: value.length } },
      ];
      historyIndex.current = 0;
    }
  }, [value]);
  const toolbarOpen = focused || panel;
  return (
    <section
      className={`journal-paper rich-journal ${panel ? 'has-sticker-panel' : ''}`}
    >
      {/* Contenteditable is needed for inline images; a textarea only displays plain text. */}
      <div
        className="journal-editor"
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Inline images require contenteditable.
        role="textbox"
        tabIndex={0}
        aria-label="记录正文"
        aria-multiline="true"
        spellCheck
        onFocus={() => {
          setFocused(true);
          if (!panel && editor.current) editor.current.inputMode = 'text';
        }}
        onBlur={() => {
          saveSelection();
          setFocused(false);
        }}
        onInput={emit}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            !event.nativeEvent.isComposing
          ) {
            if (
              event.key.toLowerCase() === 'z' ||
              event.key.toLowerCase() === 'y'
            ) {
              event.preventDefault();
              undo(event.shiftKey || event.key.toLowerCase() === 'y' ? 1 : -1);
            }
          }
        }}
        onKeyUp={saveSelection}
        onPointerUp={saveSelection}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
          emit();
        }}
        onCopy={(event) => copy(event)}
        onCut={(event) => copy(event, true)}
        onPaste={(event) => {
          event.preventDefault();
          saveSelection();
          insert(event.clipboardData.getData('text/plain'));
        }}
        onDrop={(event) => event.preventDefault()}
      />
      <div className="journal-editor-footer">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="插入表情"
          onPointerDown={(event) => {
            event.preventDefault();
            saveSelection();
          }}
          onClick={openPanel}
        >
          <Smile />
          表情
        </Button>
        <span>{value.length} 字</span>
      </div>
      {notice && <output className="journal-editor-notice">{notice}</output>}
      {toolbarOpen &&
        createPortal(
          <div
            ref={dock}
            className={`journal-composer-dock ${panel ? 'is-expanded' : ''}`}
            style={
              {
                '--keyboard-bottom': `${viewport.bottom}px`,
                '--visible-height': `${viewport.height || 600}px`,
              } as CSSProperties
            }
          >
            <div className="journal-composer-toolbar">
              <span>留下这一刻</span>
              <Button
                type="button"
                variant="ghost"
                aria-label={panel ? '切回键盘' : '打开表情'}
                onPointerDown={(event) => {
                  event.preventDefault();
                  saveSelection();
                }}
                onClick={() => {
                  if (panel) {
                    setPanel(false);
                    restoreSelection(true);
                  } else openPanel();
                }}
              >
                {panel ? <Keyboard /> : <Smile />}
                {panel ? '键盘' : '表情'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="收起编辑工具"
                onClick={() => {
                  setPanel(false);
                  setFocused(false);
                  editor.current?.blur();
                }}
              >
                <X />
              </Button>
            </div>
            {panel && (
              <StickerPanel
                title="点一个表情，放进正在写的句子"
                onClose={() => setPanel(false)}
                onSelect={(text) => insert(text, false)}
              />
            )}
          </div>,
          portalTarget ?? document.body,
        )}
    </section>
  );
}
