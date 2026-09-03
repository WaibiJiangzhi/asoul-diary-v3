'use client';

import type { CSSProperties, SyntheticEvent, UIEvent } from 'react';
import { useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock3,
  Copy,
  Footprints,
  NotebookPen,
  Pencil,
  Plus,
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
import { JIARAN_STICKERS, type GrowthDraft } from './constants';
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
  onArchive: (goal: ProgressGoal, natural: boolean) => void;
  onCopy: (memory: GrowthMemory) => void;
  onDeleteMemory: (memory: GrowthMemory) => void;
  onAddCountdownNote: (countdownId: string, text: string) => void;
  onDeleteCountdownNote: (countdown: Countdown, note: CountdownNote) => void;
}) {
  const [selectedMemory, setSelectedMemory] = useState<GrowthMemory | null>(
    null,
  );
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [progressIndex, setProgressIndex] = useState(0);
  const [noteCountdown, setNoteCountdown] = useState<Countdown | null>(null);
  const [countdownNote, setCountdownNote] = useState('');
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
              const latestNote = item.notes.at(-1);
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
                  <div className="countdown-main">
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
                  {latestNote && (
                    <p className="countdown-latest-note">
                      <NotebookPen />
                      <span>{latestNote.text}</span>
                      <time>{formatMoment(latestNote.createdAt)}</time>
                    </p>
                  )}
                  <Button
                    className="countdown-note-button"
                    variant="outline"
                    onClick={() => {
                      setNoteCountdown(item);
                      setCountdownNote('');
                    }}
                  >
                    <NotebookPen />
                    写下今天的话
                  </Button>
                  <details className="countdown-notes">
                    <summary>
                      <span>
                        <Footprints /> 日子手记 · {item.notes.length}
                      </span>
                      <ChevronDown />
                    </summary>
                    {item.notes.length ? (
                      <ol>
                        {[...item.notes].reverse().map((note) => (
                          <li key={note.id}>
                            <span>
                              <small>{formatMoment(note.createdAt)}</small>
                              <strong>{note.text}</strong>
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`删除${formatMoment(note.createdAt)}的日子手记`}
                              onClick={() => onDeleteCountdownNote(item, note)}
                            >
                              <Trash2 />
                            </Button>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>还没有写过，今天可以留下第一句。</p>
                    )}
                  </details>
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
                onDeleteEvent={onDeleteEvent}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            ))}
          </div>
        ) : (
          <div className="gentle-empty roomy">
            <span>🌱</span>
            <strong>还没有正在记录的进度</strong>
            <p>比如“这个月跑 30 km”，每点一次，进度就向前一点。</p>
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
          <p className="memory-lead">完成得怎样都没关系，有尝试就很棒了。</p>
          <div className="memory-list">
            {state.memories.map((memory) => (
              <article
                className="memory-card"
                key={memory.id}
                style={{ '--card-accent': memory.color } as CSSProperties}
              >
                <button
                  className="memory-open"
                  type="button"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <Decoration
                    value={memory.emoji}
                    className="memory-emoji"
                    alt="成长纪念表情"
                  />
                  <span>
                    <small>
                      {new Date(memory.endedAt).toLocaleDateString('zh-CN')}{' '}
                      收藏
                    </small>
                    <strong>{memory.title}</strong>
                    <span>
                      {memory.current}/{memory.total} {memory.unit} ·{' '}
                      {memory.events.length} 条足迹
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="打开成长纪念"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <Footprints />
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}

      <MemoryDetailDrawer
        memory={selectedMemory}
        onOpenChange={(open) => !open && setSelectedMemory(null)}
        onCopy={(memory) => {
          onCopy(memory);
          setSelectedMemory(null);
        }}
        onDelete={(memory) => {
          onDeleteMemory(memory);
          setSelectedMemory(null);
        }}
      />
      <CountdownNoteDrawer
        countdown={noteCountdown}
        note={countdownNote}
        onNoteChange={setCountdownNote}
        onOpenChange={(open) => {
          if (!open) {
            setNoteCountdown(null);
            setCountdownNote('');
          }
        }}
        onSave={() => {
          if (!noteCountdown) return;
          onAddCountdownNote(noteCountdown.id, countdownNote);
          setNoteCountdown(null);
          setCountdownNote('');
        }}
      />
    </div>
  );
}

function ProgressCard({
  goal,
  active,
  onAdjust,
  onDeleteEvent,
  onEdit,
  onDelete,
  onArchive,
}: {
  goal: ProgressGoal;
  active: boolean;
  onAdjust: (id: string, delta: number, note?: string) => void;
  onDeleteEvent: (goal: ProgressGoal, event: ProgressEvent) => void;
  onEdit: (item: ProgressGoal) => void;
  onDelete: (item: ProgressGoal) => void;
  onArchive: (goal: ProgressGoal, natural: boolean) => void;
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
      <div className="goal-top">
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
        <b style={{ left: `clamp(12px, ${percentage}%, calc(100% - 12px))` }}>
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
            placeholder="顺手写下一句话（可选）"
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

      <details className="footsteps">
        <summary>
          <span>
            <Footprints />
            成长足迹 · {goal.events.length} 条
          </span>
          <ChevronDown />
        </summary>
        {goal.events.length ? (
          <ol>
            {[...goal.events].reverse().map((event) => (
              <li key={event.id}>
                <span className="footstep-copy">
                  <span>{formatMoment(event.createdAt)}</span>
                  {event.note && <small>{event.note}</small>}
                </span>
                <strong className={event.delta >= 0 ? 'positive' : 'negative'}>
                  {event.delta >= 0 ? '+' : ''}
                  {event.delta} {goal.unit}
                </strong>
                <small>累计 {event.valueAfter}</small>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`删除${formatMoment(event.createdAt)}的足迹`}
                  onClick={() => onDeleteEvent(goal, event)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <p>记录一次进度，第一条足迹就会留在这里。</p>
        )}
      </details>

      {goal.current >= goal.total ? (
        <Button
          className="archive-button"
          onClick={() => onArchive(goal, true)}
        >
          <Sparkles />
          完成了，收进纪念册
        </Button>
      ) : (
        <Button
          className="finish-early"
          variant="ghost"
          onClick={() => onArchive(goal, false)}
        >
          <Archive />
          现在结束这段成长
        </Button>
      )}
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer tall">
        <form className="drawer-inner stack-form" onSubmit={onSave}>
          <DrawerHeader>
            <DrawerTitle>
              {draft.id ? '编辑' : '新建'}
              {draft.kind === 'progress' ? '进度目标' : '倒计时'}
            </DrawerTitle>
            <DrawerDescription>
              {draft.kind === 'progress'
                ? '每一次加减都会自动留下一条足迹。'
                : '把值得期待的日子放在手边。'}
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
                <ArrowUp />
                上移
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onMove(draft.kind, draft.id!, 1)}
              >
                <ArrowDown />
                下移
              </Button>
            </div>
          )}

          <label className="field-label">
            名称
            <Input
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder={
                draft.kind === 'progress' ? '例如：九月跑量' : '例如：去看演出'
              }
              maxLength={40}
            />
          </label>

          <fieldset className="decoration-picker">
            <legend>给这张卡片选一个表情</legend>
            <div className="emoji-choice">
              <Input
                aria-label="使用 Emoji"
                value={isSticker(draft.emoji) ? '' : draft.emoji}
                onChange={(event) =>
                  patch({ emoji: event.target.value.slice(0, 4) || '🌱' })
                }
                placeholder="🌱"
              />
              <span>也可以从下面选择一张嘉然动态表情</span>
            </div>
            <div className="sticker-grid" aria-label="2026嘉然的画册动态表情包">
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
          </fieldset>

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
            {(['#DB7D74', '#E799B0', '#576690'] as ProgressGoal['color'][]).map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  className={draft.color === color ? 'active' : ''}
                  style={{ background: color }}
                  aria-label={`选择颜色 ${color}`}
                  onClick={() => patch({ color })}
                />
              ),
            )}
          </fieldset>

          <label className="field-label">
            一句话（可选）
            <Input
              value={draft.note}
              onChange={(event) => patch({ note: event.target.value })}
              maxLength={80}
              placeholder="写给自己看就好"
            />
          </label>
          <Button type="submit" size="lg" disabled={!draft.title.trim()}>
            <Save />
            {draft.id ? '保存修改' : '开始记录'}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function MemoryDetailDrawer({
  memory,
  onOpenChange,
  onCopy,
  onDelete,
}: {
  memory: GrowthMemory | null;
  onOpenChange: (open: boolean) => void;
  onCopy: (memory: GrowthMemory) => void;
  onDelete: (memory: GrowthMemory) => void;
}) {
  return (
    <Drawer open={!!memory} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer tall">
        {memory && (
          <div
            className="drawer-inner memory-detail"
            style={{ '--card-accent': memory.color } as CSSProperties}
          >
            <DrawerHeader>
              <div className="memory-detail-title">
                <Decoration
                  value={memory.emoji}
                  className="memory-detail-emoji"
                  alt="成长纪念表情"
                />
                <div>
                  <p>成长纪念</p>
                  <DrawerTitle>{memory.title}</DrawerTitle>
                </div>
              </div>
              <DrawerDescription>
                {memory.note || '这段认真走过的路，值得被记住。'}
              </DrawerDescription>
            </DrawerHeader>

            <section className="memory-summary">
              <div>
                <small>最后走到</small>
                <strong>
                  {memory.current}/{memory.total} {memory.unit}
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
              {memory.events.length ? (
                <ol>
                  {memory.events.map((event) => (
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
                  ))}
                </ol>
              ) : (
                <p>这次没有留下单独的调整记录，但尝试本身已经值得收藏。</p>
              )}
            </section>

            <div className="memory-detail-actions">
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
        )}
      </DrawerContent>
    </Drawer>
  );
}

function CountdownNoteDrawer({
  countdown,
  note,
  onNoteChange,
  onOpenChange,
  onSave,
}: {
  countdown: Countdown | null;
  note: string;
  onNoteChange: (note: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  return (
    <Drawer open={!!countdown} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer">
        {countdown && (
          <div className="drawer-inner stack-form countdown-note-drawer">
            <DrawerHeader>
              <DrawerTitle>写给期待的日子</DrawerTitle>
              <DrawerDescription>
                这句话会按时间留在“{countdown.title}”的日子手记里。
              </DrawerDescription>
            </DrawerHeader>
            <label className="field-label">
              今天想说些什么？
              <Input
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                maxLength={120}
                placeholder="例如：又准备了一点，也更期待了一点"
              />
            </label>
            <Button
              type="button"
              size="lg"
              onClick={onSave}
              disabled={!note.trim()}
            >
              <NotebookPen />
              留下今天这句话
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
