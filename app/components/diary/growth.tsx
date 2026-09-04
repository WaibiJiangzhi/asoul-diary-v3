'use client';

import type { CSSProperties, SyntheticEvent, UIEvent } from 'react';
import { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Footprints,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { daysUntil, formatMoment, formatShortDate } from '@/lib/date';
import type {
  AppState,
  Countdown,
  CountdownNote,
  GrowthMemory,
  ProgressEvent,
  ProgressGoal,
} from '@/lib/types';
import { CARD_COLORS, JIARAN_STICKERS, type GrowthDraft } from './constants';
import { Decoration, isSticker } from './decoration';

function syncCarouselIndex(
  event: UIEvent<HTMLDivElement>,
  setIndex: (index: number) => void,
) {
  const rail = event.currentTarget;
  const railCenter = rail.getBoundingClientRect().left + rail.clientWidth / 2;
  const cards = [...rail.querySelectorAll<HTMLElement>('[data-carousel-card]')];
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - railCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  setIndex(nearestIndex);
}

export function GrowthView({
  state,
  onAdd,
  onAdjust,
  onDeleteEvent,
  onEdit,
  onDelete,
  onArchive,
  onCopy,
  onRestoreMemory,
  onDeleteMemory,
  onAddCountdownNote,
  onDeleteCountdownNote,
}: {
  state: AppState;
  onAdd: (kind: GrowthDraft['kind']) => void;
  onAdjust: (id: string, delta: number, note?: string) => void;
  onDeleteEvent: (goal: ProgressGoal, event: ProgressEvent) => void;
  onEdit: (item: Countdown | ProgressGoal) => void;
  onDelete: (item: Countdown | ProgressGoal) => void;
  onArchive: (item: Countdown | ProgressGoal, natural: boolean) => void;
  onCopy: (memory: GrowthMemory) => void;
  onRestoreMemory: (memory: GrowthMemory) => void;
  onDeleteMemory: (memory: GrowthMemory) => void;
  onAddCountdownNote: (countdownId: string, text: string) => void;
  onDeleteCountdownNote: (countdown: Countdown, note: CountdownNote) => void;
}) {
  const [selectedMemory, setSelectedMemory] = useState<GrowthMemory | null>(
    null,
  );
  const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [progressIndex, setProgressIndex] = useState(0);
  const [countdownNotes, setCountdownNotes] = useState<Record<string, string>>(
    {},
  );
  const [countdownHistoryId, setCountdownHistoryId] = useState<string | null>(
    null,
  );
  const [progressHistoryId, setProgressHistoryId] = useState<string | null>(
    null,
  );
  const countdownHistory = state.countdowns.find(
    (item) => item.id === countdownHistoryId,
  );
  const progressHistory = state.progressGoals.find(
    (item) => item.id === progressHistoryId,
  );
  const visibleCountdownIndex = Math.min(
    countdownIndex,
    Math.max(0, state.countdowns.length - 1),
  );
  const visibleProgressIndex = Math.min(
    progressIndex,
    Math.max(0, state.progressGoals.length - 1),
  );

  return (
    <div className="view-stack growth-view">
      <section className="growth-actions" aria-label="添加成长记录">
        <Button onClick={() => onAdd('countdown')}>
          <Clock3 />
          添加倒计时
        </Button>
        <Button variant="outline" onClick={() => onAdd('progress')}>
          <Plus />
          添加进度
        </Button>
      </section>

      {!!state.countdowns.length && (
        <section className="growth-section">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">LOOKING FORWARD</p>
              <h2>期待的日子</h2>
            </div>
            <span className="carousel-count" aria-live="polite">
              {visibleCountdownIndex + 1} / {state.countdowns.length}
            </span>
          </div>
          <div
            className="countdown-grid growth-carousel"
            onScroll={(event) => syncCarouselIndex(event, setCountdownIndex)}
          >
            {state.countdowns.map((item, index) => {
              const days = daysUntil(item.targetDate);
              const noteDraft = countdownNotes[item.id] ?? '';
              return (
                <article
                  className={`paper-card countdown-card ${index === visibleCountdownIndex ? 'is-active' : ''}`}
                  key={item.id}
                  data-carousel-card
                  style={{ '--card-accent': item.color } as CSSProperties}
                >
                  <time dateTime={item.targetDate} className="countdown-date">
                    {formatShortDate(item.targetDate)}
                  </time>
                  <div
                    className={`countdown-main ${item.emoji ? '' : 'no-decoration'}`}
                  >
                    <Decoration
                      value={item.emoji}
                      className="countdown-emoji"
                      alt="倒计时表情"
                    />
                    <div className="countdown-copy">
                      <strong>{item.title}</strong>
                      {item.note && <p>{item.note}</p>}
                    </div>
                    <div className="countdown-number">
                      <b>{Math.abs(days)}</b>
                      <span>{days >= 0 ? '天后' : '天前'}</span>
                    </div>
                  </div>
                  <form
                    className="countdown-note-entry"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const note = noteDraft.trim();
                      if (!note) return;
                      onAddCountdownNote(item.id, note);
                      setCountdownNotes((current) => ({
                        ...current,
                        [item.id]: '',
                      }));
                    }}
                  >
                    <label>
                      <NotebookPen aria-hidden="true" />
                      <Input
                        value={noteDraft}
                        onChange={(event) =>
                          setCountdownNotes((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        maxLength={120}
                        aria-label={`给${item.title}写一条日子手记`}
                      />
                    </label>
                    <Button type="submit" disabled={!noteDraft.trim()}>
                      确认记录
                    </Button>
                  </form>
                  <Button
                    className="history-trigger"
                    variant="ghost"
                    onClick={() => setCountdownHistoryId(item.id)}
                  >
                    <span>
                      <Footprints /> 日子手记 · {item.notes.length}
                    </span>
                    <ChevronRight />
                  </Button>
                  <Button
                    className={days <= 0 ? 'archive-button' : 'finish-early'}
                    variant={days <= 0 ? 'default' : 'ghost'}
                    onClick={() => onArchive(item, days <= 0)}
                  >
                    {days <= 0 ? <Sparkles /> : <Archive />}
                    {days <= 0 ? '日子到了，收进纪念册' : '提前结束倒计时'}
                  </Button>
                  <div className="card-tools">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="编辑倒计时"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="删除倒计时"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="growth-section">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">GROWING</p>
            <h2>正在发生的成长</h2>
          </div>
          {!!state.progressGoals.length && (
            <span className="carousel-count" aria-live="polite">
              {visibleProgressIndex + 1} / {state.progressGoals.length}
            </span>
          )}
        </div>
        {state.progressGoals.length ? (
          <div
            className="goal-list growth-carousel"
            onScroll={(event) => syncCarouselIndex(event, setProgressIndex)}
          >
            {state.progressGoals.map((goal, index) => (
              <ProgressCard
                key={`${goal.id}:${goal.step}`}
                goal={goal}
                active={index === visibleProgressIndex}
                onAdjust={onAdjust}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
                onOpenHistory={setProgressHistoryId}
              />
            ))}
          </div>
        ) : (
          <div className="gentle-empty roomy">
            <span>🌱</span>
            <strong>还没有正在记录的进度</strong>
            <Button variant="outline" onClick={() => onAdd('progress')}>
              <Plus />
              开始一个
            </Button>
          </div>
        )}
      </section>

      {!!state.memories.length && (
        <section className="memory-section">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">MEMORIES</p>
              <h2>成长纪念册</h2>
            </div>
          </div>
          <div className="memory-list">
            {state.memories.slice(0, 2).map((memory) => (
              <MemoryRow
                memory={memory}
                key={memory.id}
                onOpen={() => {
                  setSelectedMemory(memory);
                  setMemoryDrawerOpen(true);
                }}
              />
            ))}
          </div>
          <Button
            className="memory-all-button"
            variant="ghost"
            onClick={() => {
              setSelectedMemory(null);
              setMemoryDrawerOpen(true);
            }}
          >
            查看全部 {state.memories.length} 段成长
            <ChevronDown aria-hidden="true" />
          </Button>
        </section>
      )}

      <MemoryLibraryDrawer
        open={memoryDrawerOpen}
        memories={state.memories}
        memory={selectedMemory}
        onSelect={setSelectedMemory}
        onOpenChange={(open) => {
          setMemoryDrawerOpen(open);
          if (!open) setSelectedMemory(null);
        }}
        onCopy={(memory) => {
          onCopy(memory);
          setMemoryDrawerOpen(false);
          setSelectedMemory(null);
        }}
        onRestore={(memory) => {
          onRestoreMemory(memory);
          setMemoryDrawerOpen(false);
          setSelectedMemory(null);
        }}
        onDelete={(memory) => {
          onDeleteMemory(memory);
          setMemoryDrawerOpen(false);
          setSelectedMemory(null);
        }}
      />
      <CountdownHistoryDrawer
        countdown={countdownHistory ?? null}
        onOpenChange={(open) => !open && setCountdownHistoryId(null)}
        onDelete={onDeleteCountdownNote}
      />
      <ProgressHistoryDrawer
        goal={progressHistory ?? null}
        onOpenChange={(open) => !open && setProgressHistoryId(null)}
        onDelete={onDeleteEvent}
      />
    </div>
  );
}

function MemoryRow({
  memory,
  onOpen,
}: {
  memory: GrowthMemory;
  onOpen: () => void;
}) {
  return (
    <article
      className="memory-card"
      style={{ '--card-accent': memory.color } as CSSProperties}
    >
      <button className="memory-open" type="button" onClick={onOpen}>
        <Decoration
          value={memory.emoji}
          className="memory-emoji"
          alt="成长纪念表情"
        />
        <span>
          <small>
            {new Date(memory.endedAt).toLocaleDateString('zh-CN')} 收藏
          </small>
          <strong>{memory.title}</strong>
          <span>
            {memory.kind === 'progress'
              ? `${memory.current}/${memory.total} ${memory.unit} · ${memory.events.length} 条足迹`
              : `${formatShortDate(memory.targetDate)} · ${memory.notes.length} 条手记`}
          </span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="打开成长纪念"
        onClick={onOpen}
      >
        <Footprints />
      </Button>
    </article>
  );
}

function ProgressCard({
  goal,
  active,
  onAdjust,
  onEdit,
  onDelete,
  onArchive,
  onOpenHistory,
}: {
  goal: ProgressGoal;
  active: boolean;
  onAdjust: (id: string, delta: number, note?: string) => void;
  onEdit: (item: ProgressGoal) => void;
  onDelete: (item: ProgressGoal) => void;
  onArchive: (goal: ProgressGoal, natural: boolean) => void;
  onOpenHistory: (goalId: string) => void;
}) {
  const [amount, setAmount] = useState(String(goal.step));
  const [note, setNote] = useState('');
  const percentage = Math.min(
    100,
    Math.round((goal.current / goal.total) * 100),
  );
  const numericAmount = Number(amount);
  const lastEvent = goal.events.at(-1);

  function submitAdjustment(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(numericAmount) || numericAmount === 0) return;
    onAdjust(goal.id, numericAmount, note);
    setNote('');
  }

  return (
    <article
      className={`paper-card progress-card ${active ? 'is-active' : ''}`}
      data-carousel-card
      style={{ '--card-accent': goal.color } as CSSProperties}
    >
      <div className={`goal-top ${goal.emoji ? '' : 'no-decoration'}`}>
        <Decoration
          value={goal.emoji}
          className="goal-emoji"
          alt="进度目标表情"
        />
        <div className="goal-copy">
          <small>完成 {percentage}%</small>
          <h3>{goal.title}</h3>
          {goal.note && <p>{goal.note}</p>}
        </div>
        <div className="card-tools">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="编辑目标"
            onClick={() => onEdit(goal)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="删除目标"
            onClick={() => onDelete(goal)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="goal-number">
        <strong>{goal.current.toLocaleString()}</strong>
        <span>
          / {goal.total.toLocaleString()} {goal.unit}
        </span>
      </div>
      <div className="goal-progress" aria-label={`进度 ${percentage}%`}>
        <i style={{ width: `${percentage}%` }} />
        <b style={{ left: `clamp(24px, ${percentage}%, calc(100% - 24px))` }}>
          {percentage}%
        </b>
      </div>

      <form className="progress-adjust" onSubmit={submitAdjustment}>
        <label>
          <span>本次调整</span>
          <Input
            type="number"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label={`调整${goal.title}的进度，负数表示减少`}
          />
          <small>{goal.unit}</small>
        </label>
        <label className="progress-adjust-note">
          <NotebookPen />
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={100}
            aria-label="为这次进度留一句话（可选）"
          />
        </label>
        <Button
          type="submit"
          disabled={!Number.isFinite(numericAmount) || numericAmount === 0}
        >
          确认记录
        </Button>
        <small className="progress-last-update">
          {lastEvent
            ? `最近 ${lastEvent.delta >= 0 ? '+' : ''}${lastEvent.delta} ${goal.unit} · ${formatMoment(lastEvent.createdAt)}`
            : '还没有足迹；填写负数可以减少进度'}
        </small>
      </form>

      <Button
        className="history-trigger"
        variant="ghost"
        onClick={() => onOpenHistory(goal.id)}
      >
        <span>
          <Footprints /> 成长足迹 · {goal.events.length} 条
        </span>
        <ChevronRight />
      </Button>

      <Button
        className={
          goal.current >= goal.total ? 'archive-button' : 'finish-early'
        }
        variant={goal.current >= goal.total ? 'default' : 'ghost'}
        onClick={() => onArchive(goal, goal.current >= goal.total)}
      >
        {goal.current >= goal.total ? <Sparkles /> : <Archive />}
        {goal.current >= goal.total ? '完成了，收进纪念册' : '现在结束这段成长'}
      </Button>
    </article>
  );
}

export function GrowthDrawer({
  open,
  draft,
  onOpenChange,
  onDraftChange,
  onSave,
  onMove,
}: {
  open: boolean;
  draft: GrowthDraft;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: GrowthDraft) => void;
  onSave: (event: SyntheticEvent<HTMLFormElement>) => void;
  onMove: (kind: GrowthDraft['kind'], id: string, direction: -1 | 1) => void;
}) {
  const patch = (next: Partial<GrowthDraft>) =>
    onDraftChange({ ...draft, ...next });
  const decorationMode = isSticker(draft.emoji) ? 'sticker' : 'emoji';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer tall">
        <form
          className="drawer-inner stack-form"
          style={{ '--card-accent': draft.color } as CSSProperties}
          onSubmit={onSave}
        >
          <DrawerHeader>
            <DrawerTitle>
              {draft.id ? '编辑' : '新建'}
              {draft.kind === 'progress' ? '进度目标' : '倒计时'}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              填写成长记录
            </DrawerDescription>
          </DrawerHeader>

          {!draft.id && (
            <div className="segmented">
              <button
                type="button"
                className={draft.kind === 'countdown' ? 'active' : ''}
                onClick={() => patch({ kind: 'countdown' })}
              >
                倒计时
              </button>
              <button
                type="button"
                className={draft.kind === 'progress' ? 'active' : ''}
                onClick={() => patch({ kind: 'progress' })}
              >
                进度
              </button>
            </div>
          )}

          {draft.id && (
            <div className="sort-actions" aria-label="调整卡片顺序">
              <span>卡片顺序</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => onMove(draft.kind, draft.id!, -1)}
              >
                <ArrowLeft />
                左移
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onMove(draft.kind, draft.id!, 1)}
              >
                <ArrowRight />
                右移
              </Button>
            </div>
          )}

          <label className="field-label">
            名称
            <Input
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder={
                draft.kind === 'progress' ? '进度名称' : '期待的日子'
              }
              maxLength={40}
            />
          </label>

          {draft.kind === 'countdown' ? (
            <label className="field-label">
              目标日期
              <Input
                type="date"
                value={draft.targetDate}
                onChange={(event) => patch({ targetDate: event.target.value })}
              />
            </label>
          ) : (
            <div className="number-fields">
              <label className="field-label">
                当前
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.current}
                  onChange={(event) => patch({ current: event.target.value })}
                />
              </label>
              <label className="field-label">
                总目标
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={draft.total}
                  onChange={(event) => patch({ total: event.target.value })}
                />
              </label>
              <label className="field-label">
                单位
                <Input
                  value={draft.unit}
                  onChange={(event) => patch({ unit: event.target.value })}
                  maxLength={8}
                />
              </label>
              <label className="field-label">
                默认调整量
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={draft.step}
                  onChange={(event) => patch({ step: event.target.value })}
                />
              </label>
            </div>
          )}

          <fieldset className="color-picker">
            <legend>卡片主题色</legend>
            <div>
              {CARD_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={draft.color === color.value ? 'active' : ''}
                  style={{ background: color.value }}
                  aria-label={`选择${color.label}`}
                  onClick={() => patch({ color: color.value })}
                />
              ))}
            </div>
          </fieldset>

          <label className="field-label">
            一句话（可选）
            <Input
              value={draft.note}
              onChange={(event) => patch({ note: event.target.value })}
              maxLength={80}
            />
          </label>

          <details className="decoration-picker">
            <summary>
              <span>
                <strong>卡片表情</strong>
                <small>
                  {decorationMode === 'sticker'
                    ? '2026 嘉然动态表情'
                    : draft.emoji
                      ? 'Emoji'
                      : '留空'}
                </small>
              </span>
              <Decoration
                value={draft.emoji}
                className="decoration-preview"
                alt="当前卡片表情"
              />
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="decoration-options">
              <div className="segmented decoration-modes">
                <button
                  type="button"
                  className={decorationMode === 'emoji' ? 'active' : ''}
                  onClick={() =>
                    patch({
                      emoji: isSticker(draft.emoji) ? '' : draft.emoji,
                    })
                  }
                >
                  Emoji
                </button>
                <button
                  type="button"
                  className={decorationMode === 'sticker' ? 'active' : ''}
                  onClick={() =>
                    patch({
                      emoji: isSticker(draft.emoji)
                        ? draft.emoji
                        : JIARAN_STICKERS[0].src,
                    })
                  }
                >
                  嘉然表情
                </button>
              </div>

              {decorationMode === 'emoji' && (
                <div className="emoji-choice">
                  <Input
                    aria-label="使用 Emoji，可留空"
                    value={draft.emoji}
                    placeholder="Emoji"
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) =>
                      patch({ emoji: event.target.value.slice(0, 12) })
                    }
                  />
                  <span>可留空，也可用手机 Emoji 键盘输入。</span>
                </div>
              )}

              {decorationMode === 'sticker' && (
                <div
                  className="sticker-grid"
                  aria-label="2026嘉然的画册动态表情包"
                >
                  {JIARAN_STICKERS.map((sticker) => (
                    <button
                      type="button"
                      key={sticker.src}
                      className={draft.emoji === sticker.src ? 'active' : ''}
                      aria-label={`选择${sticker.name}`}
                      onClick={() => patch({ emoji: sticker.src })}
                    >
                      <Decoration value={sticker.src} alt={sticker.name} />
                      <small>{sticker.name}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </details>

          <Button type="submit" size="lg" disabled={!draft.title.trim()}>
            <Save />
            {draft.id ? '保存修改' : '开始记录'}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function MemoryLibraryDrawer({
  open,
  memories,
  memory,
  onSelect,
  onOpenChange,
  onCopy,
  onRestore,
  onDelete,
}: {
  open: boolean;
  memories: GrowthMemory[];
  memory: GrowthMemory | null;
  onSelect: (memory: GrowthMemory | null) => void;
  onOpenChange: (open: boolean) => void;
  onCopy: (memory: GrowthMemory) => void;
  onRestore: (memory: GrowthMemory) => void;
  onDelete: (memory: GrowthMemory) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer tall memory-library-drawer">
        {memory ? (
          <div
            className="drawer-inner memory-detail"
            style={{ '--card-accent': memory.color } as CSSProperties}
          >
            <Button
              className="memory-back"
              variant="ghost"
              onClick={() => onSelect(null)}
            >
              <ArrowLeft />
              返回纪念册
            </Button>
            <DrawerHeader>
              <div className="memory-detail-hero">
                <Decoration
                  value={memory.emoji}
                  className="memory-detail-emoji"
                  alt="成长纪念表情"
                />
                <div className="memory-detail-title">
                  <p>成长纪念</p>
                  <DrawerTitle>{memory.title}</DrawerTitle>
                  {memory.note && (
                    <DrawerDescription>{memory.note}</DrawerDescription>
                  )}
                </div>
                <strong className="memory-final-value">
                  {memory.kind === 'progress'
                    ? memory.current.toLocaleString()
                    : Math.abs(daysUntil(memory.targetDate))}
                  <small>
                    {memory.kind === 'progress'
                      ? memory.unit
                      : daysUntil(memory.targetDate) >= 0
                        ? '天后'
                        : '天前'}
                  </small>
                </strong>
              </div>
            </DrawerHeader>

            <section className="memory-summary">
              <div>
                <small>最后走到</small>
                <strong>
                  {memory.kind === 'progress'
                    ? `${memory.current}/${memory.total} ${memory.unit}`
                    : formatShortDate(memory.targetDate)}
                </strong>
              </div>
              <div>
                <small>记录时间</small>
                <strong>
                  {new Date(memory.startedAt).toLocaleDateString('zh-CN')} —{' '}
                  {new Date(memory.endedAt).toLocaleDateString('zh-CN')}
                </strong>
              </div>
            </section>

            <section className="memory-footsteps">
              <h3>
                <Footprints />
                这一路的足迹
              </h3>
              {(
                memory.kind === 'progress'
                  ? memory.events.length
                  : memory.notes.length
              ) ? (
                <ol>
                  {memory.kind === 'progress'
                    ? memory.events.map((event) => (
                        <li key={event.id}>
                          <span className="footstep-copy">
                            <span>{formatMoment(event.createdAt)}</span>
                            {event.note && <small>{event.note}</small>}
                          </span>
                          <strong>
                            {event.delta >= 0 ? '+' : ''}
                            {event.delta} {memory.unit}
                          </strong>
                          <small>累计 {event.valueAfter}</small>
                        </li>
                      ))
                    : memory.notes.map((note) => (
                        <li key={note.id}>
                          <span className="footstep-copy">
                            <span>{formatMoment(note.createdAt)}</span>
                            <small>{note.text}</small>
                          </span>
                        </li>
                      ))}
                </ol>
              ) : (
                <p>这次没有留下单独的调整记录，但尝试本身已经值得收藏。</p>
              )}
            </section>

            <div className="memory-detail-actions">
              <Button variant="outline" onClick={() => onRestore(memory)}>
                <RotateCcw />
                恢复
              </Button>
              <Button onClick={() => onCopy(memory)}>
                <Copy />
                再来一期
              </Button>
              <Button
                variant="ghost"
                className="danger-text"
                onClick={() => onDelete(memory)}
              >
                <Trash2 />
                删除纪念
              </Button>
            </div>
          </div>
        ) : (
          <div className="drawer-inner memory-library">
            <DrawerHeader>
              <DrawerTitle>成长纪念册</DrawerTitle>
              <DrawerDescription className="sr-only">
                查看已经结束的进度和当时留下的足迹。
              </DrawerDescription>
            </DrawerHeader>
            <div className="memory-list">
              {memories.map((item) => (
                <MemoryRow
                  memory={item}
                  key={item.id}
                  onOpen={() => onSelect(item)}
                />
              ))}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function CountdownHistoryDrawer({
  countdown,
  onOpenChange,
  onDelete,
}: {
  countdown: Countdown | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (countdown: Countdown, note: CountdownNote) => void;
}) {
  return (
    <Drawer open={!!countdown} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer tall history-drawer">
        {countdown && (
          <div
            className="drawer-inner growth-history"
            style={{ '--card-accent': countdown.color } as CSSProperties}
          >
            <DrawerHeader>
              <DrawerTitle>日子手记 · {countdown.notes.length}</DrawerTitle>
              <DrawerDescription>{countdown.title}</DrawerDescription>
            </DrawerHeader>
            {countdown.notes.length ? (
              <ol className="growth-history-list countdown-history-list">
                {[...countdown.notes].reverse().map((note) => (
                  <li key={note.id}>
                    <span>
                      <time>{formatMoment(note.createdAt)}</time>
                      <strong>{note.text}</strong>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除${formatMoment(note.createdAt)}的日子手记`}
                      onClick={() => onDelete(countdown, note)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="history-empty">还没有日子手记</p>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function ProgressHistoryDrawer({
  goal,
  onOpenChange,
  onDelete,
}: {
  goal: ProgressGoal | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (goal: ProgressGoal, event: ProgressEvent) => void;
}) {
  return (
    <Drawer open={!!goal} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer tall history-drawer">
        {goal && (
          <div
            className="drawer-inner growth-history"
            style={{ '--card-accent': goal.color } as CSSProperties}
          >
            <DrawerHeader>
              <DrawerTitle>成长足迹 · {goal.events.length}</DrawerTitle>
              <DrawerDescription>{goal.title}</DrawerDescription>
            </DrawerHeader>
            {goal.events.length ? (
              <ol className="growth-history-list progress-history-list">
                {[...goal.events].reverse().map((event) => (
                  <li key={event.id}>
                    <span className="footstep-copy">
                      <time>{formatMoment(event.createdAt)}</time>
                      {event.note && <strong>{event.note}</strong>}
                    </span>
                    <span className="history-value">
                      <b className={event.delta >= 0 ? 'positive' : 'negative'}>
                        {event.delta >= 0 ? '+' : ''}
                        {event.delta} {goal.unit}
                      </b>
                      <small>累计 {event.valueAfter}</small>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除${formatMoment(event.createdAt)}的足迹`}
                      onClick={() => onDelete(goal, event)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="history-empty">还没有成长足迹</p>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
