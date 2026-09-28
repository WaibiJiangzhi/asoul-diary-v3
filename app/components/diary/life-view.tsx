'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Decoration } from './decoration';
import { DecorationPicker } from './sticker-picker';
import { Sheet } from './life-form';
import { CARD_COLORS } from './constants';
import { usePhotoUrls } from '@/hooks/use-photo-urls';
import Image from 'next/image';
import { inGroup } from '@/lib/card-groups';
import { dailyCards, hasRecordToday } from '@/lib/daily-cards';
import { memoryCollection } from '@/lib/memories';
import type { ReactNode } from 'react';
import { ProgressSummary, RecordText } from './life-detail';
import {
  SortableList,
  SortableGrip,
  type SortableHandle,
} from './sortable-list';
import { createId } from '@/lib/defaults';
import {
  cardDeadline,
  deadlineDistance,
  priorityCompanions,
  canRecord,
  completed,
  lastRecord,
  recentDays,
  stageComplete,
  stageEmoji,
  progressValue,
  statusRecord,
} from '@/lib/life';
import { dateKey, formatShortDate, moveDate } from '@/lib/date';
import type { CompanionCard, LifeCard } from '@/lib/types';
export function CompanionShelf({
  cards,
  onEdit,
  today,
  selection,
  startWithFirst = false,
}: {
  today: string;
  selection?: { id: string };
  startWithFirst?: boolean;
  cards: CompanionCard[];
  onEdit: () => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const initializedDay = useRef<string | null>(null);
  const lastIndex = useRef(0);
  const [index, setIndex] = useState(0);
  const ids = cards.map((c) => c.id).join('|');
  useEffect(() => {
    const node = rail.current;
    if (!node || !cards.length) return;
    const priority = priorityCompanions(cards, today);
    const next =
      initializedDay.current === today
        ? Math.min(lastIndex.current, cards.length - 1)
        : startWithFirst
          ? 0
          : cards.indexOf(
              priority[Math.floor(Math.random() * priority.length)],
            );
    initializedDay.current = today;
    lastIndex.current = next;
    node.scrollTo({ left: next * node.clientWidth, behavior: 'instant' });
    setIndex(next);
  }, [ids, cards, today, startWithFirst]); // Keep the choice during the day; reconsider priority after midnight.
  useEffect(() => {
    const i = cards.findIndex((c) => c.id === selection?.id);
    if (!selection) return;
    if (i >= 0 && rail.current) {
      rail.current.scrollTo({
        left: i * rail.current.clientWidth,
        behavior: 'smooth',
      });
    }
    rail.current
      ?.closest('.companion-section')
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selection, cards]);
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      if (node.clientWidth)
        node.scrollTo({
          left: lastIndex.current * node.clientWidth,
          behavior: 'instant',
        });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  function move(i: number) {
    const node = rail.current;
    if (node)
      node.scrollTo({
        left: ((i + cards.length) % cards.length) * node.clientWidth,
        behavior: 'smooth',
      });
  }
  return (
    <section
      className="companion-section"
      aria-label="陪伴与期待"
      style={
        {
          '--companion-accent': cards[index]?.color ?? 'var(--theme-accent)',
        } as CSSProperties
      }
    >
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
                    <p
                      className={`companion-count ${deadlineDistance(c.targetDate, today) === 0 ? 'is-today' : ''}`}
                    >
                      {deadlineDistance(c.targetDate, today) > 0 ? (
                        <>
                          还有{' '}
                          <strong>
                            {deadlineDistance(c.targetDate, today)}
                          </strong>{' '}
                          天
                        </>
                      ) : deadlineDistance(c.targetDate, today) === 0 ? (
                        <strong className="companion-today">就是今天✨</strong>
                      ) : (
                        <>
                          已经过去{' '}
                          <strong>
                            {Math.abs(deadlineDistance(c.targetDate, today))}
                          </strong>{' '}
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
              {cards.length > 5 ? (
                <span className="companion-page" aria-live="polite">
                  {index + 1} / {cards.length}
                </span>
              ) : (
                cards.map((c, i) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-label={'查看陪伴卡 ' + (i + 1)}
                    aria-current={index === i}
                    onClick={() => move(i)}
                  >
                    <i />
                  </button>
                ))
              )}
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
            const recorded = hasRecordToday(card, date);
            return (
              <button
                key={date}
                type="button"
                disabled={!canRecord(card, date, today)}
                aria-label={
                  date +
                  ' ' +
                  (status?.name ?? (recorded ? '已写记录，未选状态' : '未记录'))
                }
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
                ) : recorded ? (
                  <span className="week-note">
                    <Pencil size={16} aria-hidden="true" />
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
          {card.stages?.map((s) => (
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
        </div>
      )}
      {!isLater && card.kind === 'blank' && latest && (
        <p className="blank-recent">
          <RecordText text={latest.body || '留下了一次记录'} />
        </p>
      )}
      {cardDeadline(card) && !completed(card) && (
        <button
          type="button"
          className="card-deadline"
          data-urgent={[0, 1].includes(
            deadlineDistance(cardDeadline(card)!, today),
          )}
          onClick={onMenu}
        >
          {deadlineDistance(cardDeadline(card)!, today) < 0
            ? '原定 ' + formatShortDate(cardDeadline(card)!) + ' · 可调整日期'
            : deadlineDistance(cardDeadline(card)!, today) === 0
              ? '今天是期待的日子'
              : deadlineDistance(cardDeadline(card)!, today) === 1
                ? '明天就是期待的日子'
                : (card.kind === 'blank' ? '期待 ' : '希望在 ') +
                  formatShortDate(cardDeadline(card)!) +
                  (card.kind === 'blank' ? '' : ' 完成') +
                  ' · 还有 ' +
                  deadlineDistance(cardDeadline(card)!, today) +
                  ' 天'}
        </button>
      )}
      <div className="life-card-footer">
        <button
          type="button"
          className="card-history-link"
          data-recorded-today={latest?.date === today}
          onClick={onOpen}
        >
          {isLater
            ? '把想做的事先记在这里'
            : latest?.date === today
              ? '✓ 今天已记录'
              : latest
                ? '最近记录 · ' +
                  (latest.date === moveDate(today, -1)
                    ? '昨天'
                    : formatShortDate(latest.date))
                : '还没有记录'}
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
  preview = false,
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
  group = 'all',
  groupControls,
}: {
  cards: LifeCard[];
  companions: CompanionCard[];
  preview?: boolean;
  group?: string;
  groupControls: (actions: ReactNode) => ReactNode;
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
  const [dailyOnly, setDailyOnly] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState<{ id: string }>();
  const upcoming = [
    ...companions
      .filter((c) => c.kind === 'countdown' && c.targetDate)
      .map((c) => ({
        id: c.id,
        title: c.title,
        date: c.targetDate!,
        companion: true,
      })),
    ...cards
      .filter(
        (c) => c.location === 'active' && !completed(c) && cardDeadline(c),
      )
      .map((c) => ({
        id: c.id,
        title: c.title,
        date: cardDeadline(c)!,
        companion: false,
      })),
  ]
    .filter((c) => [0, 1].includes(deadlineDistance(c.date, today)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const daily = dailyCards(cards, today, group);
  const remaining = daily.filter((card) => !hasRecordToday(card, today)).length;
  const active = dailyOnly
    ? daily
    : cards.filter((c) => c.location === 'active' && inGroup(c, group));
  const later = cards.filter(
    (c) => c.location === 'later' && inGroup(c, group),
  );
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
      <CompanionShelf
        cards={companions}
        onEdit={onCompanions}
        today={today}
        selection={selectedCompanion}
        startWithFirst={preview}
      />
      {!!upcoming.length && (
        <details className="upcoming-dates" key={today}>
          <summary>
            <span>
              今天 {upcoming.filter((c) => c.date === today).length}
              <span className="upcoming-separator">·</span>
              明天 {upcoming.filter((c) => c.date !== today).length}
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          {upcoming.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() =>
                c.companion ? setSelectedCompanion({ id: c.id }) : onOpen(c.id)
              }
            >
              <span>{c.title}</span>
              <small data-today={c.date === today}>
                {c.date === today ? '今天 ✨' : '明天'}
              </small>
            </button>
          ))}
        </details>
      )}
      <div className="life-section-heading">
        <div>
          <p>MY LITTLE STEPS</p>
          <h1>生活，慢慢来</h1>
        </div>
        <div className="life-section-tools">
          {!dailyOnly && active.length > 1 && (
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
              className="life-add-card"
              aria-label="添加卡片"
              onClick={onNew}
            >
              <Plus />
            </Button>
          )}
        </div>
      </div>
      {groupControls(
        <button
          className="daily-filter-toggle"
          type="button"
          aria-label="每日记录"
          title="每日记录"
          aria-pressed={dailyOnly}
          onClick={() => {
            setDailyOnly((value) => !value);
            setSorting(false);
          }}
        >
          <CalendarCheck size={20} aria-hidden="true" />
        </button>,
      )}
      {dailyOnly && daily.length > 0 && (
        <output className="daily-filter-summary">
          {remaining
            ? `今天还有 ${remaining} 张没记`
            : '今天想记的，都留下啦 ✨'}
        </output>
      )}
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
          <h2>{dailyOnly ? '这里还没有每日记录的卡片' : '想从哪件事开始？'}</h2>
          <p>
            {dailyOnly
              ? '在卡片编辑里开启「加入每日记录」，开始后就会出现在这里。也可以切换分组看看。'
              : '想做的事、日常的小事，都可以从一张卡片开始。'}
          </p>
        </div>
      )}
      <Button className="new-life-card" onClick={onNew}>
        <Plus />
        添加卡片
      </Button>
      {!dailyOnly && later.length > 0 && (
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
  group = 'all',
  groupControls,
}: {
  cards: LifeCard[];
  group?: string;
  groupControls?: ReactNode;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [month, setMonth] = useState('all');
  const [order, setOrder] = useState('newest');
  const { memories, months, selectedMonth, shown } = memoryCollection(cards, {
    group,
    query,
    filter,
    month,
    order,
  });
  return (
    <div className="memory-view">
      <div className="life-section-heading">
        <div>
          <p>THE WAY I’VE COME</p>
          <h1>纪念册</h1>
        </div>
        <span>{memories.length} 段经历</span>
      </div>
      {groupControls}
      {memories.length > 0 && (
        <>
          <Input
            aria-label="搜索纪念册"
            placeholder="找一段经历…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="memory-time-controls">
            <label>
              收录月份
              <select
                value={selectedMonth}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="all">全部月份</option>
                {months.map((m) => (
                  <option value={m} key={m}>
                    {m.replace('-', '年')}月
                  </option>
                ))}
              </select>
            </label>
            <label>
              时间排序
              <select value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="newest">最近收录在前</option>
                <option value="oldest">最早收录在前</option>
              </select>
            </label>
          </div>
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
                {c.ending === 'achieved' ? '做到了' : '这一段，先收好了'}
              </small>
              <strong>{c.title}</strong>
              <span>
                <RecordText
                  text={c.summary || c.note || '把这一段经历，好好留下。'}
                />
              </span>
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
              ? '换个关键词、分组或筛选条件试试看。'
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
    color: '#E799B0',
  });
  const [draft, setDraft] = useState<CompanionCard>(blank);
  const [error, setError] = useState('');
  return (
    <Sheet
      title="陪着你的话与日子"
      description="拖动右侧手柄调整顺序，首页按此顺序左右切换。"
      onClose={onClose}
      wide
    >
      <SortableList
        className="companion-manage-list"
        ids={cards.map((c) => c.id)}
        onReorder={(activeId, overId) => {
          const from = cards.findIndex((c) => c.id === activeId);
          const to = cards.findIndex((c) => c.id === overId);
          if (from >= 0 && to >= 0) onChange(arrayMove(cards, from, to));
        }}
      >
        {(id, handle) => {
          const c = cards.find((card) => card.id === id)!;
          return (
            <div className="companion-manage-row">
              <button type="button" onClick={() => setDraft({ ...c })}>
                <Decoration value={c.emoji} className="status-emoji" />
                <span>{c.title}</span>
                <Pencil />
              </button>
              {cards.length > 1 && (
                <SortableGrip handle={handle} label={'排序陪伴卡 ' + c.title} />
              )}
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
          );
        }}
      </SortableList>
      <form
        className="life-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.title.trim()) {
            setError('请填写标题');
            return;
          }
          const saved: CompanionCard = {
            ...draft,
            kind: draft.targetDate ? 'countdown' : 'quote',
            targetDate: draft.targetDate || undefined,
          };
          onChange(
            cards.some((c) => c.id === draft.id)
              ? cards.map((c) => (c.id === draft.id ? saved : c))
              : [...cards, saved],
          );
          setDraft(blank());
          setError('');
        }}
      >
        <DecorationPicker
          value={draft.emoji}
          onChange={(emoji) => setDraft((c) => ({ ...c, emoji }))}
        />
        <fieldset className="config-block">
          <legend>卡片主题色</legend>
          <div className="color-options">
            <button
              type="button"
              className="follow-theme-color"
              aria-label="跟随应用主题"
              aria-pressed={!draft.color}
              onClick={() => setDraft((c) => ({ ...c, color: undefined }))}
            >
              跟随主题
            </button>
            {CARD_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={color.label}
                aria-pressed={draft.color === color.value}
                style={{ '--swatch': color.value } as CSSProperties}
                onClick={() => setDraft((c) => ({ ...c, color: color.value }))}
              />
            ))}
          </div>
        </fieldset>
        <label>
          标题
          <Input
            required
            maxLength={80}
            value={draft.title}
            onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
          />
        </label>
        <label>
          期待的日子 <small>可选，填写后显示倒计时</small>
          <Input
            type="date"
            value={draft.targetDate ?? ''}
            onChange={(e) =>
              setDraft((c) => ({ ...c, targetDate: e.target.value }))
            }
          />
        </label>
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
