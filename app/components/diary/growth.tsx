'use client';

import type { CSSProperties, SyntheticEvent } from 'react';
import { useState } from 'react';
import {
  Archive,
  ChevronDown,
  Clock3,
  Copy,
  Footprints,
  Minus,
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
  GrowthMemory,
  ProgressEvent,
  ProgressGoal,
} from '@/lib/types';
import { JIARAN_STICKERS, type GrowthDraft } from './constants';
import { Decoration, isSticker } from './decoration';

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
}: {
  state: AppState;
  onAdd: (kind: GrowthDraft['kind']) => void;
  onAdjust: (id: string, delta: number) => void;
  onDeleteEvent: (goal: ProgressGoal, event: ProgressEvent) => void;
  onEdit: (item: Countdown | ProgressGoal) => void;
  onDelete: (item: Countdown | ProgressGoal) => void;
  onArchive: (goal: ProgressGoal, natural: boolean) => void;
  onCopy: (memory: GrowthMemory) => void;
  onDeleteMemory: (memory: GrowthMemory) => void;
}) {
  const [selectedMemory, setSelectedMemory] = useState<GrowthMemory | null>(null);

  return (
    <div className="view-stack growth-view">
      <section className="view-intro growth-intro">
        <p className="hand-note">每一步，都算数</p>
        <h1>把想做的事，<br />一点点变成真的</h1>
        <p>倒数值得期待的日子，也收好每一次向前。</p>
      </section>

      <section className="growth-actions" aria-label="添加成长记录">
        <Button onClick={() => onAdd('progress')}>
          <Plus />添加进度
        </Button>
        <Button variant="outline" onClick={() => onAdd('countdown')}>
          <Clock3 />添加倒计时
        </Button>
      </section>

      {!!state.countdowns.length && (
        <section className="growth-section">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">LOOKING FORWARD</p>
              <h2>期待的日子</h2>
            </div>
          </div>
          <div className="countdown-grid">
            {state.countdowns.map((item) => {
              const days = daysUntil(item.targetDate);
              return (
                <article className="paper-card countdown-card" key={item.id}>
                  <Decoration value={item.emoji} className="countdown-emoji" alt="倒计时表情" />
                  <div className="countdown-copy">
                    <small>{formatShortDate(item.targetDate)}</small>
                    <strong>{item.title}</strong>
                    {item.note && <p>{item.note}</p>}
                  </div>
                  <div className="countdown-number">
                    <b>{Math.abs(days)}</b>
                    <span>{days >= 0 ? '天后' : '天前'}</span>
                  </div>
                  <div className="card-tools">
                    <Button variant="ghost" size="icon-sm" aria-label="编辑倒计时" onClick={() => onEdit(item)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="删除倒计时" onClick={() => onDelete(item)}>
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
        </div>
        {state.progressGoals.length ? (
          <div className="goal-list">
            {state.progressGoals.map((goal) => (
              <ProgressCard
                key={goal.id}
                goal={goal}
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
              <Plus />开始一个
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
              <article className="memory-card" key={memory.id}>
                <button className="memory-open" type="button" onClick={() => setSelectedMemory(memory)}>
                  <Decoration value={memory.emoji} className="memory-emoji" alt="成长纪念表情" />
                  <span>
                    <small>{new Date(memory.endedAt).toLocaleDateString('zh-CN')} 收藏</small>
                    <strong>{memory.title}</strong>
                    <span>{memory.current}/{memory.total} {memory.unit} · {memory.events.length} 条足迹</span>
                  </span>
                </button>
                <Button variant="ghost" size="icon-sm" aria-label="打开成长纪念" onClick={() => setSelectedMemory(memory)}>
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
    </div>
  );
}

function ProgressCard({
  goal,
  onAdjust,
  onDeleteEvent,
  onEdit,
  onDelete,
  onArchive,
}: {
  goal: ProgressGoal;
  onAdjust: (id: string, delta: number) => void;
  onDeleteEvent: (goal: ProgressGoal, event: ProgressEvent) => void;
  onEdit: (item: ProgressGoal) => void;
  onDelete: (item: ProgressGoal) => void;
  onArchive: (goal: ProgressGoal, natural: boolean) => void;
}) {
  const percentage = Math.min(100, Math.round((goal.current / goal.total) * 100));

  return (
    <article className="paper-card progress-card" style={{ '--goal-color': goal.color } as CSSProperties}>
      <div className="goal-top">
        <Decoration value={goal.emoji} className="goal-emoji" alt="进度目标表情" />
        <div className="goal-copy">
          <small>完成 {percentage}%</small>
          <h3>{goal.title}</h3>
          {goal.note && <p>{goal.note}</p>}
        </div>
        <div className="card-tools">
          <Button variant="ghost" size="icon-sm" aria-label="编辑目标" onClick={() => onEdit(goal)}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="删除目标" onClick={() => onDelete(goal)}>
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="goal-number">
        <strong>{goal.current.toLocaleString()}</strong>
        <span>/ {goal.total.toLocaleString()} {goal.unit}</span>
      </div>
      <div className="goal-progress" aria-label={`进度 ${percentage}%`}>
        <i style={{ width: `${percentage}%` }} />
        <b style={{ left: `clamp(12px, ${percentage}%, calc(100% - 12px))` }}>{percentage}%</b>
      </div>

      <div className="adjust-row">
        <Button variant="outline" size="lg" onClick={() => onAdjust(goal.id, -goal.step)} disabled={goal.current <= 0}>
          <Minus />{goal.step}
        </Button>
        <Button size="lg" onClick={() => onAdjust(goal.id, goal.step)} disabled={goal.current >= goal.total}>
          <Plus />{goal.step} {goal.unit}
        </Button>
      </div>

      <details className="footsteps">
        <summary>
          <span><Footprints />成长足迹 · {goal.events.length} 条</span>
          <ChevronDown />
        </summary>
        {goal.events.length ? (
          <ol>
            {[...goal.events].reverse().map((event) => (
              <li key={event.id}>
                <span>{formatMoment(event.createdAt)}</span>
                <strong className={event.delta >= 0 ? 'positive' : 'negative'}>
                  {event.delta >= 0 ? '+' : ''}{event.delta} {goal.unit}
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
          <p>点一次加号，第一条足迹就会留在这里。</p>
        )}
      </details>

      {goal.current >= goal.total ? (
        <Button className="archive-button" onClick={() => onArchive(goal, true)}>
          <Sparkles />完成了，收进纪念册
        </Button>
      ) : (
        <Button className="finish-early" variant="ghost" onClick={() => onArchive(goal, false)}>
          <Archive />现在结束这段成长
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
}: {
  open: boolean;
  draft: GrowthDraft;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: GrowthDraft) => void;
  onSave: (event: SyntheticEvent<HTMLFormElement>) => void;
}) {
  const patch = (next: Partial<GrowthDraft>) => onDraftChange({ ...draft, ...next });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer tall">
        <form className="drawer-inner stack-form" onSubmit={onSave}>
          <DrawerHeader>
            <DrawerTitle>{draft.id ? '编辑' : '新建'}{draft.kind === 'progress' ? '进度目标' : '倒计时'}</DrawerTitle>
            <DrawerDescription>
              {draft.kind === 'progress'
                ? '每一次加减都会自动留下一条足迹。'
                : '把值得期待的日子放在手边。'}
            </DrawerDescription>
          </DrawerHeader>

          {!draft.id && (
            <div className="segmented">
              <button type="button" className={draft.kind === 'progress' ? 'active' : ''} onClick={() => patch({ kind: 'progress' })}>进度</button>
              <button type="button" className={draft.kind === 'countdown' ? 'active' : ''} onClick={() => patch({ kind: 'countdown' })}>倒计时</button>
            </div>
          )}

          <label className="field-label">
            名称
            <Input
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder={draft.kind === 'progress' ? '例如：九月跑量' : '例如：去看演出'}
              maxLength={40}
            />
          </label>

          <fieldset className="decoration-picker">
            <legend>给这张卡片选一个表情</legend>
            <div className="emoji-choice">
              <Input
                aria-label="使用 Emoji"
                value={isSticker(draft.emoji) ? '' : draft.emoji}
                onChange={(event) => patch({ emoji: event.target.value.slice(0, 4) || '🌱' })}
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
              <Input type="date" value={draft.targetDate} onChange={(event) => patch({ targetDate: event.target.value })} />
            </label>
          ) : (
            <div className="number-fields">
              <label className="field-label">当前<Input type="number" min="0" step="any" value={draft.current} onChange={(event) => patch({ current: event.target.value })} /></label>
              <label className="field-label">总目标<Input type="number" min="0.01" step="any" value={draft.total} onChange={(event) => patch({ total: event.target.value })} /></label>
              <label className="field-label">单位<Input value={draft.unit} onChange={(event) => patch({ unit: event.target.value })} maxLength={8} /></label>
              <label className="field-label">每次调整<Input type="number" min="0.01" step="any" value={draft.step} onChange={(event) => patch({ step: event.target.value })} /></label>
            </div>
          )}

          {draft.kind === 'progress' && (
            <fieldset className="color-picker">
              <legend>卡片颜色</legend>
              {(['#E799B0', '#DB7D74', '#576690'] as ProgressGoal['color'][]).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={draft.color === color ? 'active' : ''}
                  style={{ background: color }}
                  aria-label={`选择颜色 ${color}`}
                  onClick={() => patch({ color })}
                />
              ))}
            </fieldset>
          )}

          <label className="field-label">
            一句话（可选）
            <Input value={draft.note} onChange={(event) => patch({ note: event.target.value })} maxLength={80} placeholder="写给自己看就好" />
          </label>
          <Button type="submit" size="lg" disabled={!draft.title.trim()}>
            <Save />{draft.id ? '保存修改' : '开始记录'}
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
          <div className="drawer-inner memory-detail">
            <DrawerHeader>
              <div className="memory-detail-title">
                <Decoration value={memory.emoji} className="memory-detail-emoji" alt="成长纪念表情" />
                <div>
                  <p>成长纪念</p>
                  <DrawerTitle>{memory.title}</DrawerTitle>
                </div>
              </div>
              <DrawerDescription>{memory.note || '这段认真走过的路，值得被记住。'}</DrawerDescription>
            </DrawerHeader>

            <section className="memory-summary">
              <div><small>最后走到</small><strong>{memory.current}/{memory.total} {memory.unit}</strong></div>
              <div><small>记录时间</small><strong>{new Date(memory.startedAt).toLocaleDateString('zh-CN')} — {new Date(memory.endedAt).toLocaleDateString('zh-CN')}</strong></div>
            </section>

            <section className="memory-footsteps">
              <h3><Footprints />这一路的足迹</h3>
              {memory.events.length ? (
                <ol>
                  {memory.events.map((event) => (
                    <li key={event.id}>
                      <span>{formatMoment(event.createdAt)}</span>
                      <strong>{event.delta >= 0 ? '+' : ''}{event.delta} {memory.unit}</strong>
                      <small>累计 {event.valueAfter}</small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>这次没有留下单独的调整记录，但尝试本身已经值得收藏。</p>
              )}
            </section>

            <div className="memory-detail-actions">
              <Button onClick={() => onCopy(memory)}><Copy />再来一期</Button>
              <Button variant="ghost" className="danger-text" onClick={() => onDelete(memory)}><Trash2 />删除纪念</Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

