'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock3, Copy, Smile, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { STICKER_PACKS, getSticker } from '@/lib/stickers';
import { DAILY_EMOJIS } from './constants';
import { Decoration } from './decoration';

const RECENTS_KEY = 'asoul-sticker-recents';
const PACK_KEY = 'asoul-sticker-pack';
const EMOJIS = [
  ...DAILY_EMOJIS,
  '😊',
  '🥰',
  '🥹',
  '😴',
  '😌',
  '😤',
  '😭',
  '🤗',
  '❤️',
  '💗',
  '👍',
  '👏',
  '✅',
  '🍚',
  '🎨',
  '💪',
  '📝',
  '🎂',
  '🎉',
  '🧘',
];

function readPreferences() {
  let packId = STICKER_PACKS[0].id;
  let recents: string[] = [];
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(RECENTS_KEY) ?? '[]',
    );
    recents = Array.isArray(saved)
      ? saved
          .filter(
            (value): value is string =>
              typeof value === 'string' &&
              (!!getSticker(value) ||
                (value.length <= 24 && !value.includes('['))),
          )
          .slice(0, 30)
      : [];
    const last = localStorage.getItem(PACK_KEY);
    if (
      last &&
      (last === 'emoji' ||
        last === 'recent' ||
        STICKER_PACKS.some((pack) => pack.id === last))
    )
      packId = last;
    else if (recents.length) packId = 'recent';
  } catch {
    /* Selection works without preference storage. */
  }
  return { packId, recents };
}

export function StickerPanel({
  onSelect,
  onClose,
  title = '选择表情',
  allowClear = false,
}: {
  onSelect: (value: string) => void;
  onClose: () => void;
  title?: string;
  allowClear?: boolean;
}) {
  const [preferences] = useState(readPreferences);
  const [packId, setPackId] = useState(preferences.packId);
  const [recents, setRecents] = useState(preferences.recents);
  const [customEmoji, setCustomEmoji] = useState('');
  const [copyMode, setCopyMode] = useState(false);
  const [managing, setManaging] = useState(false);
  const [notice, setNotice] = useState('');
  const tabs = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = tabs.current?.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    );
    if (active && tabs.current)
      tabs.current.scrollLeft =
        active.offsetLeft -
        tabs.current.clientWidth / 2 +
        active.clientWidth / 2;
    grid.current?.scrollTo({ top: 0 });
  }, [packId]);
  const pack = STICKER_PACKS.find((item) => item.id === packId);
  const values =
    packId === 'emoji'
      ? EMOJIS
      : packId === 'recent'
        ? recents
        : (pack?.stickers.map((item) => item.token) ?? []);
  function changePack(id: string) {
    setManaging(false);
    setPackId(id);
    try {
      localStorage.setItem(PACK_KEY, id);
    } catch {
      /* Optional preference. */
    }
  }
  async function choose(value: string) {
    if (managing && packId === 'recent') {
      const next = recents.filter((item) => item !== value);
      setRecents(next);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* Recent preferences are optional. */
      }
      setNotice('已从最近使用移除');
      return;
    }
    if (copyMode) {
      try {
        await navigator.clipboard.writeText(getSticker(value)?.token ?? value);
        setNotice('已复制');
      } catch {
        setNotice('复制暂不可用，可以在日记正文中选中复制');
      }
      return;
    }
    const recent = [value, ...recents.filter((item) => item !== value)].slice(
      0,
      30,
    );
    setRecents(recent);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(recent));
    } catch {
      /* Optional preference. */
    }
    onSelect(value);
  }
  return (
    <div className="sticker-panel" aria-label={title}>
      <div className="sticker-panel-heading">
        <div>
          <strong>
            {pack?.name ?? (packId === 'recent' ? '最近使用' : 'Emoji')}
          </strong>
          <small aria-live="polite">
            {notice ||
              (managing
                ? '点叉移除，不影响已经写下的表情'
                : copyMode
                  ? '点一个表情，复制文字代号'
                  : title)}
          </small>
        </div>
        {packId === 'recent' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={managing}
            onClick={() => {
              setManaging(!managing);
              setCopyMode(false);
              setNotice('');
            }}
          >
            {managing ? '完成' : '管理'}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="复制代号模式"
          aria-pressed={copyMode}
          onClick={() => {
            setCopyMode(!copyMode);
            setManaging(false);
            setNotice('');
          }}
        >
          <Copy />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="关闭表情面板"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      {packId === 'emoji' && (
        <div className="sticker-custom-emoji">
          <Input
            aria-label="输入手机 Emoji"
            placeholder="也可以用手机键盘输入 Emoji"
            value={customEmoji}
            onChange={(e) => setCustomEmoji(e.target.value)}
            maxLength={24}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={!customEmoji.trim()}
            onClick={() => void choose(customEmoji.trim())}
          >
            使用
          </Button>
        </div>
      )}
      <div className="sticker-grid" ref={grid}>
        {values.map((value) => {
          const sticker = getSticker(value);
          return (
            <button
              type="button"
              key={value}
              className={managing ? 'is-removing-recent' : undefined}
              aria-label={`${managing ? '从最近移除' : copyMode ? '复制' : '选择'}${sticker?.name ?? value}`}
              onClick={() => void choose(value)}
            >
              <Decoration value={value} className="sticker-option-image" />
              {managing && (
                <X className="recent-remove-mark" aria-hidden="true" />
              )}
              {sticker && (
                <span className="sticker-option-name">{sticker.name}</span>
              )}
            </button>
          );
        })}
        {!values.length && (
          <p className="sticker-empty">选过的表情会留在这里</p>
        )}
      </div>
      <div className="sticker-pack-bar" ref={tabs} aria-label="表情包">
        <button
          type="button"
          aria-label="最近使用"
          aria-pressed={packId === 'recent'}
          onClick={() => changePack('recent')}
        >
          <Clock3 />
        </button>
        <button
          type="button"
          aria-label="Emoji"
          aria-pressed={packId === 'emoji'}
          onClick={() => changePack('emoji')}
        >
          <Smile />
        </button>
        {STICKER_PACKS.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-label={item.name}
            title={item.name}
            aria-pressed={packId === item.id}
            onClick={() => changePack(item.id)}
          >
            <Image
              src={item.cover}
              alt={item.name}
              width={40}
              height={40}
              unoptimized
            />
          </button>
        ))}
        {allowClear && (
          <button
            type="button"
            aria-label="不使用表情"
            onClick={() => onSelect('')}
          >
            <X />
          </button>
        )}
      </div>
    </div>
  );
}

export function DecorationPicker({
  value,
  onChange,
  label = '选择表情',
  compact = false,
  allowClear = true,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`decoration-select ${compact ? 'is-compact' : ''}`}
        aria-label={label}
        onClick={() => {
          (document.activeElement as HTMLElement | null)?.blur();
          setOpen(true);
        }}
      >
        {value ? (
          <Decoration value={value} className="decoration-select-image" />
        ) : (
          <Smile />
        )}
        {!compact && (
          <span>
            {label}
            <small>
              {getSticker(value)?.name ??
                (value ? '点一下更换' : '可选 Emoji 或姐仨表情')}
            </small>
          </span>
        )}
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className="sheet-drawer sticker-drawer"
          initialFocus={false}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>{label}</DrawerTitle>
            <DrawerDescription>
              左右切换表情包，点一个表情选好
            </DrawerDescription>
          </DrawerHeader>
          <StickerPanel
            title={label}
            allowClear={allowClear}
            onClose={() => setOpen(false)}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}
