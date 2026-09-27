'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Decoration } from './decoration';
import { DecorationPicker } from './sticker-picker';
import { Sheet } from './life-form';
import { usePhotoUrls } from './life-record';
import Image from 'next/image';
import { ProgressSummary, RecordText } from './life-detail';
import {
  SortableList,
  SortableGrip,
  type SortableHandle,
} from './sortable-list';
import { createId } from '@/lib/defaults';
import {
  canRecord,
  completed,
  elapsedDays,
  lastRecord,
  recentDays,
  stageComplete,
  stageEmoji,
  progressValue,
  statusRecord,
} from '@/lib/life';
import { dateKey, daysUntil, formatShortDate } from '@/lib/date';
import type { CompanionCard, LifeCard } from '@/lib/types';
export function CompanionShelf({
  cards,
  onEdit,
}: {
  cards: CompanionCard[];
  onEdit: () => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const lastIndex = useRef(0);
  const [index, setIndex] = useState(0);
  const ids = cards.map((c) => c.id).join('|');
  useEffect(() => {
    const node = rail.current;
    if (!node || !cards.length) return;
    const next = initialized.current
      ? Math.min(lastIndex.current, cards.length - 1)
      : Math.floor(Math.random() * cards.length);
    initialized.current = true;
    node.scrollTo({ left: next * node.clientWidth, behavior: 'instant' });
    setIndex(next);
  }, [ids, cards.length]); // Keep the chosen card until a fresh app session.
  function move(i: number) {
    const node = rail.current;
    if (node)
      node.scrollTo({
        left: ((i + cards.length) % cards.length) * node.clientWidth,
        behavior: 'smooth',
      });
  }
  return (
    <section className="companion-section" aria-label="陪伴与期待">
      {cards.length ? (
        <>
          <div
            className="companion-rail"
            ref={rail}
            onScroll={(e) => {
              const n = e.currentTarget;
              if (n.clientWidth) {
                lastIndex.current = Math.round(n.scrollLeft / n.clientWidth);
                setIndex(lastIndex.current);
              }
            }}
          >
            {cards.map((c) => (
              <article className="companion-card" key={c.id}>
                <Decoration value={c.emoji} className="companion-emoji" />
                <div>
                  <h2>{c.title}</h2>
                  {c.kind === 'countdown' && c.targetDate && (
                    <p className="companion-count">
                      {daysUntil(c.targetDate) > 0 ? (
                        <>
                          还有 <strong>{daysUntil(c.targetDate)}</strong> 天
                        </>
                      ) : daysUntil(c.targetDate) === 0 ? (
                        '就是今天'
                      ) : (
                        <>
                          已经过去{' '}
                          <strong>{Math.abs(daysUntil(c.targetDate))}</strong>{' '}
                          天
                        </>
                      )}
                      <small>{formatShortDate(c.targetDate)}</small>
                    </p>
                  )}
                  <p>{c.note}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="companion-navigation">
            {cards.length > 1 && (
              <button
                type="button"
                aria-label="上一张陪伴卡"
                onClick={() => move(index - 1)}
              >
                <ArrowLeft />
              </button>
            )}
            <div>
              {cards.map((c, i) => (
                <button
                  type="button"
                  key={c.id}
                  aria-label={'查看陪伴卡 ' + (i + 1)}
                  aria-current={index === i}
                  onClick={() => move(i)}
                >
                  <i />
                </button>
              ))}
            </div>
            {cards.length > 1 && (
              <button
                type="button"
                aria-label="下一张陪伴卡"
                onClick={() => move(index + 1)}
              >
                <ArrowRight />
              </button>
            )}
            <button type="button" aria-label="管理陪伴卡" onClick={onEdit}>
              <Pencil />
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="empty-companion" onClick={onEdit}>
          <Plus />
          放一句话，或期待一个日子
        </button>
      )}
    </section>
  );
}
function SmallCard({
  card,
  today,
  onOpen,
  onRecord,
  onStage,
  onMenu,
  onStart,
  onAdjust,
  handle,
}: {
  card: LifeCard;
  today: string;
  onOpen: () => void;
  onRecord: (date?: string) => void;
  onStage: (id: string) => void;
  onMenu: () => void;
  onStart: () => void;
  onAdjust: (direction: -1 | 1) => void;
  handle?: SortableHandle;
}) {
  const latest = lastRecord(card);
  const isLater = card.location === 'later';
  return (
    <article
      className={'life-card ' + (completed(card) ? 'is-complete' : '')}
      style={{ '--card-accent': card.color } as CSSProperties}
    >
      <div className="life-card-top">
        <button className="life-card-open" type="button" onClick={onOpen}>
          <Decoration value={card.emoji} className="life-card-emoji" />
          <span>
            <strong>{card.title}</strong>
            {card.note && <small>{card.note}</small>}
          </span>
        </button>
        {handle ? (
          <SortableGrip handle={handle} label={'拖动排序 ' + card.title} />
        ) : (
          <button
            type="button"
            className="life-icon-button"
            aria-label={'管理 ' + card.title}
            onClick={onMenu}
          >
            <MoreHorizontal />
          </button>
        )}
      </div>
      {!isLater && card.kind === 'record' && (
        <div className="week-status">
          {recentDays(today).map((date) => {
            const record = statusRecord(card, date);
            const status = card.record?.states.find(
              (s) => s.id === record?.statusId,
            );
            return (
              <button
                key={date}
                type="button"
                disabled={!canRecord(card, date, today)}
                aria-label={date + ' ' + (status?.name ?? '未记录')}
                className={date === today ? 'is-today' : ''}
                onClick={() => onRecord(date)}
              >
                <small>
                  {date === today ? '今天' : Number(date.slice(-2)) + '日'}
                </small>
                {status?.emoji ? (
                  <Decoration value={status.emoji} className="week-emoji" />
                ) : status ? (
                  <span className="week-word" style={{ color: status.color }}>
                    {status.name}
                  </span>
                ) : (
                  <i className="week-empty" />
                )}
              </button>
            );
          })}
        </div>
      )}
      {!isLater && card.kind === 'progress' && (
        <>
          <ProgressSummary card={card} />
          <div className="quick-progress" aria-label={card.title + '快捷调整'}>
            <button
              type="button"
              disabled={
                !canRecord(card, today, today) || progressValue(card) <= 0
              }
              onClick={() => onAdjust(-1)}
              aria-label={
                '减少 ' + card.progress?.step + ' ' + card.progress?.unit
              }
            >
              − {card.progress?.step}
              <small>{card.progress?.unit}</small>
            </button>
            <button
              type="button"
              disabled={!canRecord(card, today, today)}
              onClick={() => onAdjust(1)}
              aria-label={
                '增加 ' + card.progress?.step + ' ' + card.progress?.unit
              }
            >
              ＋ {card.progress?.step}
              <small>{card.progress?.unit}</small>
            </button>
          </div>
        </>
      )}
      {!isLater && card.kind === 'stage' && (
        <div className="stage-preview">
          {card.stages?.slice(0, 4).map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={stageComplete(card, s.id)}
              onClick={() => onStage(s.id)}
            >
              <span className="stage-sticker-slot">
                {stageEmoji(card, s.id) && (
                  <Decoration
                    value={stageEmoji(card, s.id)}
                    className="stage-sticker"
                  />
                )}
              </span>
              <i>{stageComplete(card, s.id) && <Check />}</i>
              <span>{s.title}</span>
            </button>
          ))}
          {(card.stages?.length ?? 0) > 4 && (
            <button className="more-stages" type="button" onClick={onOpen}>
              另 {card.stages!.length - 4} 步<ChevronRight />
            </button>
          )}
        </div>
      )}
      {!isLater && card.kind === 'blank' && latest && (
        <p className="blank-recent">
          <RecordText text={latest.body || '留下了一次记录'} />
        </p>
      )}
      <div className="life-card-footer">
        <button type="button" className="card-history-link" onClick={onOpen}>
          {isLater
            ? '把这个愿望先记在这里'
            : completed(card)
              ? '做到了，看看这一段'
              : card.kind === 'stage'
                ? '已走过 ' + elapsedDays(card.startDate, today) + ' 天'
                : latest
                  ? '最近 · ' + formatShortDate(latest.date)
                  : '从今天留下一点记录'}
          <ChevronRight />
        </button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => (isLater ? onStart() : onRecord())}
        >
          {isLater ? (
            '开始记录'
          ) : (
            <>
              <Plus />
              记录
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
export function LifeView({
  cards,
  companions,
  today,
  onNew,
  onOpen,
  onRecord,
  onStage,
  onAdjust,
  onMenu,
  onStart,
  onReorder,
  onCompanions,
}: {
  cards: LifeCard[];
  companions: CompanionCard[];
  today: string;
  onNew: () => void;
  onOpen: (id: string) => void;
  onRecord: (id: string, date?: string) => void;
  onStage: (id: string, stage: string) => void;
  onAdjust: (id: string, direction: -1 | 1) => void;
  onMenu: (id: string) => void;
  onStart: (id: string) => void;
  onReorder: (a: string, b: string) => void;
  onCompanions: () => void;
}) {
  const [sorting, setSorting] = useState(false);
  const active = cards.filter((c) => c.location === 'active');
  const later = cards.filter((c) => c.location === 'later');
  const show = (card: LifeCard, handle?: SortableHandle) => (
    <SmallCard
      key={card.id}
      card={card}
      today={today}
      onOpen={() => onOpen(card.id)}
      onRecord={(date) => onRecord(card.id, date)}
      onStage={(id) => onStage(card.id, id)}
      onAdjust={(direction) => onAdjust(card.id, direction)}
      onMenu={() => onMenu(card.id)}
      onStart={() => onStart(card.id)}
      handle={handle}
    />
  );
  return (
    <div className="life-view">
      <CompanionShelf cards={companions} onEdit={onCompanions} />
      <div className="life-section-heading">
        <div>
          <p>MY LITTLE STEPS</p>
          <h1>生活，慢慢来</h1>
        </div>
        <div className="life-section-tools">
          {active.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSorting((v) => !v)}
            >
              {sorting ? '排好了' : '排序'}
            </Button>
          )}
          {active.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              aria-label="添加卡片"
              onClick={onNew}
            >
              <Plus />
            </Button>
          )}
        </div>
      </div>
      {active.length ? (
        <SortableList
          className="life-card-list"
          ids={active.map((c) => c.id)}
          onReorder={onReorder}
        >
          {(id, handle) =>
            show(
              active.find((c) => c.id === id)!,
              sorting ? handle : undefined,
            )
          }
        </SortableList>
      ) : (
        <div className="life-empty">
          <Decoration
            value="[2026乃琳的酒馆动态表情包_爱你]"
            className="empty-sticker"
          />
          <h2>想从哪件事开始？</h2>
          <p>一个小愿望，也可以慢慢长成生活的一部分。</p>
        </div>
      )}
      <Button className="new-life-card" onClick={onNew}>
        <Plus />
        添加一件想做的事
      </Button>
      {later.length > 0 && (
        <details className="later-section">
          <summary>
            以后想做 <span>{later.length}</span>
            <ChevronRight />
          </summary>
          <div className="life-card-list">{later.map((c) => show(c))}</div>
        </details>
      )}
    </div>
  );
}
function MemoryCover({ card }: { card: LifeCard }) {
  const first = card.records.flatMap((r) => r.photoIds)[0];
  const photos = usePhotoUrls(first ? [first] : []);
  return photos[0] ? (
    <Image
      className="memory-cover"
      src={photos[0].url}
      width={120}
      height={160}
      alt="这段经历的照片"
      unoptimized
    />
  ) : (
    <Decoration value={card.emoji} className="memory-card-emoji" />
  );
}
export function MemoryView({
  cards,
  onOpen,
}: {
  cards: LifeCard[];
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const memories = cards
    .filter((c) => c.location === 'memory')
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
  const shown = memories.filter(
    (c) =>
      (filter === 'all' || c.ending === filter) &&
      (c.title + ' ' + c.note + ' ' + (c.summary ?? '')).includes(query),
  );
  return (
    <div className="memory-view">
      <div className="life-section-heading">
        <div>
          <p>THE WAY I’VE COME</p>
          <h1>纪念册</h1>
        </div>
        <span>{memories.length} 段经历</span>
      </div>
      <p className="memory-intro">有些事，真的做过。以后也想再翻一遍。</p>
      {memories.length > 0 && (
        <>
          <Input
            aria-label="搜索纪念册"
            placeholder="找一段经历…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="segmented memory-filters">
            {[
              ['all', '全部'],
              ['achieved', '做到了'],
              ['closed', '告一段落'],
            ].map(([id, name]) => (
              <button
                type="button"
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="memory-list">
        {shown.map((c) => (
          <button
            type="button"
            className="life-memory-card"
            key={c.id}
            onClick={() => onOpen(c.id)}
            style={{ '--card-accent': c.color } as CSSProperties}
          >
            <MemoryCover card={c} />
            <span>
              <small>
                {c.ending === 'achieved' ? '愿望实现了' : '这一段，先收好了'}
              </small>
              <strong>{c.title}</strong>
              <span>{c.summary || c.note || '把这一段经历，好好留下。'}</span>
              <small>
                {formatShortDate(c.startDate)} —{' '}
                {formatShortDate(
                  dateKey(new Date(c.archivedAt ?? c.updatedAt)),
                )}{' '}
                · {c.records.length} 条记录
              </small>
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
      {!shown.length && (
        <div className="life-empty">
          <span className="empty-symbol">🌷</span>
          <h2>{memories.length ? '还没找到这段经历' : '慢慢走，慢慢收藏'}</h2>
          <p>
            {memories.length
              ? '换个名字试试看。'
              : '完成一件事，或想给一段经历留个纪念时，就把它收在这里。'}
          </p>
        </div>
      )}
    </div>
  );
}
export function CompanionForm({
  cards,
  onChange,
  onClose,
}: {
  cards: CompanionCard[];
  onChange: (cards: CompanionCard[]) => void;
  onClose: () => void;
}) {
  const blank = (): CompanionCard => ({
    id: createId('companion'),
    kind: 'quote',
    title: '',
    note: '',
    emoji: '✨',
  });
  const [draft, setDraft] = useState<CompanionCard>(blank);
  const [error, setError] = useState('');
  return (
    <Sheet
      title="陪着你的话与日子"
      description="打开应用时随机翻开一张，之后可以左右切换。"
      onClose={onClose}
      wide
    >
      <div className="companion-manage-list">
        {cards.map((c) => (
          <div key={c.id}>
            <button type="button" onClick={() => setDraft({ ...c })}>
              <Decoration value={c.emoji} className="status-emoji" />
              <span>{c.title}</span>
              <Pencil />
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={'删除陪伴卡 ' + c.title}
              onClick={() => {
                onChange(cards.filter((v) => v.id !== c.id));
                if (draft.id === c.id) setDraft(blank());
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <form
        className="life-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !draft.title.trim() ||
            (draft.kind === 'countdown' && !draft.targetDate)
          ) {
            setError('请填写标题和有效日期');
            return;
          }
          onChange(
            cards.some((c) => c.id === draft.id)
              ? cards.map((c) => (c.id === draft.id ? draft : c))
              : [...cards, draft],
          );
          setDraft(blank());
          setError('');
        }}
      >
        <div className="segmented">
          <button
            type="button"
            aria-pressed={draft.kind === 'quote'}
            onClick={() => setDraft((c) => ({ ...c, kind: 'quote' }))}
          >
            一句话
          </button>
          <button
            type="button"
            aria-pressed={draft.kind === 'countdown'}
            onClick={() => setDraft((c) => ({ ...c, kind: 'countdown' }))}
          >
            倒计时
          </button>
        </div>
        <DecorationPicker
          value={draft.emoji}
          onChange={(emoji) => setDraft((c) => ({ ...c, emoji }))}
        />
        <label>
          标题
          <Input
            required
            maxLength={80}
            value={draft.title}
            onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
          />
        </label>
        {draft.kind === 'countdown' && (
          <label>
            期待的日子
            <Input
              required
              type="date"
              value={draft.targetDate ?? ''}
              onChange={(e) =>
                setDraft((c) => ({ ...c, targetDate: e.target.value }))
              }
            />
          </label>
        )}
        <label>
          再写一句 <small>可选</small>
          <textarea
            rows={2}
            maxLength={300}
            value={draft.note}
            onChange={(e) => setDraft((c) => ({ ...c, note: e.target.value }))}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" className="form-submit">
          {cards.some((c) => c.id === draft.id) ? '保存修改' : '添加陪伴卡'}
        </Button>
      </form>
    </Sheet>
  );
}
