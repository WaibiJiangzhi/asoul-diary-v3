'use client';
import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import {
  CalendarDays,
  Check,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { zhCN } from 'react-day-picker/locale';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Sheet } from './life-form';
import { Decoration } from './decoration';
import { PhotoStrip } from './life-record';
import { dateKey, formatShortDate, fromDateKey, moveDate } from '@/lib/date';
import {
  canRecord,
  completed,
  elapsedDays,
  progressValue,
  recordEnd,
  recordLabel,
  stageComplete,
  stageEmoji,
  stageRecord,
} from '@/lib/life';
import { splitStickerText } from '@/lib/stickers';
import { useRingReveal } from '@/hooks/use-ring-reveal';
import type { LifeCard, LifeRecord } from '@/lib/types';
export function RecordText({ text }: { text: string }) {
  return (
    <span className="record-text">
      {splitStickerText(text).map((p, i) =>
        p.sticker ? (
          <Image
            key={i}
            src={p.sticker.src}
            alt={p.sticker.token}
            className="inline-sticker"
            width={48}
            height={48}
            unoptimized
          />
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}
export function ProgressSummary({
  card,
  large = false,
}: {
  card: LifeCard;
  large?: boolean;
}) {
  const value = progressValue(card);
  const total = card.progress?.total;
  const percent = total ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className={'counter-summary ' + (large ? 'large' : '')}>
      <div className="counter-number">
        <strong>
          {value.toLocaleString('zh-CN', { maximumFractionDigits: 4 })}
        </strong>
        <span>
          {total ? ' / ' + total.toLocaleString() + ' ' : ' '}
          {card.progress?.unit}
        </span>
      </div>
      {total && (
        <progress
          className="life-progress"
          aria-label={card.title + '的进度'}
          value={percent}
          max={100}
        />
      )}
      {large && card.progress?.expectedDate && (
        <p className="field-hint">
          希望在 <strong>{formatShortDate(card.progress.expectedDate)}</strong>{' '}
          完成
        </p>
      )}
    </div>
  );
}
export function RecordRing({ card }: { card: LifeCard }) {
  const [view, setView] = useState('date');
  const ref = useRingReveal(view, true);
  const today =
    card.location === 'memory' && card.archivedAt
      ? dateKey(new Date(card.archivedAt))
      : dateKey();
  const start = card.record?.periodDays
    ? card.startDate
    : card.startDate > moveDate(today, -29)
      ? card.startDate
      : moveDate(today, -29);
  const plannedEnd = recordEnd(card);
  const end = plannedEnd && plannedEnd > today ? plannedEnd : today;
  const days = elapsedDays(start, end);
  const dates = Array.from({ length: days }, (_, i) => moveDate(start, i));
  const states = card.record?.states ?? [];
  const statusByDate = new Map(
    card.records.filter((r) => r.statusId).map((r) => [r.date, r.statusId]),
  );
  const counts = states.map((s) => ({
    ...s,
    count: dates.filter((d) => statusByDate.get(d) === s.id).length,
  }));
  const pending = dates.filter(
    (d) => d <= today && !statusByDate.has(d),
  ).length;
  const future = dates.filter((d) => d > today).length;
  let offset = 0;
  const colors =
    view === 'date'
      ? dates.map((d) => ({
          color:
            states.find((s) => s.id === statusByDate.get(d))?.color ??
            (d > today ? '#f4eff1' : '#c8bdc8'),
          count: 1,
        }))
      : [
          ...counts,
          { color: '#c8bdc8', count: pending },
          { color: '#f4eff1', count: future },
        ];
  const stops = colors
    .filter((c) => c.count)
    .map((c) => {
      const a = offset;
      offset += c.count;
      return (
        c.color +
        ' ' +
        (a / Math.max(1, days)) * 100 +
        '% ' +
        (offset / Math.max(1, days)) * 100 +
        '%'
      );
    })
    .join(',');
  const count = counts.reduce((n, s) => n + s.count, 0);
  return (
    <section className="record-overview">
      <div className="ring-toolbar">
        <strong>
          {formatShortDate(start)}—{formatShortDate(end)}
        </strong>
        <div className="segmented">
          <button
            type="button"
            aria-pressed={view === 'date'}
            onClick={() => setView('date')}
          >
            日期
          </button>
          <button
            type="button"
            aria-pressed={view === 'overview'}
            onClick={() => setView('overview')}
          >
            总览
          </button>
        </div>
      </div>
      <div className="life-ring-wrap">
        <div
          ref={ref}
          className="life-ring"
          style={
            {
              background: stops ? 'conic-gradient(' + stops + ')' : '#f4eff1',
            } as CSSProperties
          }
        />
        <div className="life-ring-center">
          <strong>
            {count}
            <small> / {days}</small>
          </strong>
          <span>天已记录</span>
        </div>
      </div>
      <div className="ring-legend">
        {counts.map((s) => (
          <span key={s.id}>
            <i style={{ background: s.color }} />
            <Decoration value={s.emoji} className="legend-emoji" />
            {s.name}
            <b>{s.count} 天</b>
          </span>
        ))}
      </div>
      <p className="ring-footnote">
        <span>
          <i style={{ background: '#c8bdc8' }} />
          待记录 {pending}
        </span>
        <span>
          <i style={{ background: '#f4eff1' }} />
          未来 {future}
        </span>
      </p>
      {card.record?.targetDays && (
        <p className="field-hint">
          期待「{states.find((s) => s.id === card.record?.targetStateId)?.name}
          」{card.record.targetDays} 天 · 已记录{' '}
          {counts.find((s) => s.id === card.record?.targetStateId)?.count ?? 0}{' '}
          天
        </p>
      )}
    </section>
  );
}
export function CardDetail({
  card,
  onClose,
  onRecord,
  onEdit,
  onDeleteRecord,
  onStage,
  onArchive,
  onRestore,
  onNewSeason,
  onDelete,
}: {
  card: LifeCard;
  onClose: () => void;
  onRecord: (date?: string, record?: LifeRecord) => void;
  onEdit: () => void;
  onDeleteRecord: (id: string) => void;
  onStage: (id: string) => void;
  onArchive: () => void;
  onRestore: () => void;
  onNewSeason: () => void;
  onDelete: () => void;
}) {
  const [calendar, setCalendar] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const recordedDates = new Set(card.records.map((r) => r.date));
  const statusesByDate = new Map(
    card.records.filter((r) => r.statusId).map((r) => [r.date, r.statusId]),
  );
  const memory = card.location === 'memory';
  const records = [...card.records]
    .filter((r) => !date || r.date === date)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <Sheet
      title={card.title}
      description={card.note || '每一次记录，都留在这里。'}
      onClose={onClose}
      wide
    >
      <div
        className="life-detail"
        style={{ '--card-accent': card.color } as CSSProperties}
      >
        <div className="detail-identity">
          <Decoration value={card.emoji} className="detail-emoji" />
          <span>
            {memory
              ? card.ending === 'achieved'
                ? '这件事，做到了'
                : '这一段，先收好了'
              : '从 ' + formatShortDate(card.startDate) + ' 开始'}
            <small>
              走过{' '}
              {elapsedDays(
                card.startDate,
                card.archivedAt
                  ? dateKey(new Date(card.archivedAt))
                  : undefined,
              )}{' '}
              天 · {card.records.length} 条记录
            </small>
          </span>
          {!memory && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="编辑卡片"
              onClick={onEdit}
            >
              <Pencil />
            </Button>
          )}
        </div>
        {card.summary && (
          <blockquote className="memory-summary-text">
            <RecordText text={card.summary} />
          </blockquote>
        )}
        {card.kind === 'progress' && <ProgressSummary card={card} large />}
        {card.kind === 'record' && <RecordRing card={card} />}
        {card.kind === 'stage' && (
          <div className="detail-stages">
            {card.stages?.map((s) => (
              <button
                type="button"
                key={s.id}
                className={stageComplete(card, s.id) ? 'done' : ''}
                disabled={memory}
                onClick={() => onStage(s.id)}
                aria-pressed={stageComplete(card, s.id)}
              >
                <i>{stageComplete(card, s.id) && <Check />}</i>
                {stageEmoji(card, s.id) && (
                  <Decoration
                    value={stageEmoji(card, s.id)}
                    className="stage-sticker"
                  />
                )}
                <span>
                  {s.title}
                  {stageRecord(card, s.id) && (
                    <small>
                      {formatShortDate(stageRecord(card, s.id)!.date)} ·{' '}
                      {stageComplete(card, s.id) ? '已完成' : '继续尝试'}
                    </small>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
        {!memory && (
          <Button className="detail-record-button" onClick={() => onRecord()}>
            <Plus />
            记一次
          </Button>
        )}
        <div className="history-heading">
          <h3>这一段的记录</h3>
          <Button variant="ghost" onClick={() => setCalendar((v) => !v)}>
            <CalendarDays />
            {calendar ? '收起日历' : memory ? '日历回看' : '日历补记'}
          </Button>
        </div>
        {calendar && (
          <div className="life-calendar">
            <Calendar
              locale={zhCN}
              mode="single"
              selected={date ? fromDateKey(date) : undefined}
              defaultMonth={fromDateKey(date ?? dateKey())}
              onSelect={(value) => {
                setDate(value ? dateKey(value) : null);
                setLimit(30);
              }}
              disabled={[
                { before: fromDateKey(card.startDate) },
                { after: new Date() },
              ]}
              components={{
                DayButton: (props) => {
                  const key = dateKey(props.day.date);
                  const has = recordedDates.has(key);
                  const state = card.record?.states.find(
                    (s) => s.id === statusesByDate.get(key),
                  );
                  return (
                    <CalendarDayButton {...props}>
                      {props.children}
                      {has && (
                        <i
                          className="life-calendar-dot"
                          style={{
                            background: props.modifiers.selected
                              ? 'white'
                              : (state?.color ?? card.color),
                          }}
                        />
                      )}
                    </CalendarDayButton>
                  );
                },
              }}
            />
          </div>
        )}
        {date && (
          <div className="selected-date-row">
            <strong>{formatShortDate(date)}</strong>
            <Button variant="ghost" onClick={() => setDate(null)}>
              看全部
            </Button>
            {canRecord(card, date) && (
              <Button onClick={() => onRecord(date)}>记录这一天</Button>
            )}
          </div>
        )}
        {!records.length && (
          <p className="empty-history">
            这里还没有记录。慢慢来，从一句话开始也可以。
          </p>
        )}
        <ol className="life-history">
          {records.slice(0, limit).map((r) => (
            <li key={r.id}>
              <div className="history-record-head">
                <time>{formatShortDate(r.date)}</time>
                <strong>{recordLabel(card, r)}</strong>
                {!memory && (
                  <div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={'修改 ' + r.date + ' 的记录'}
                      onClick={() => onRecord(r.date, r)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={'删除 ' + r.date + ' 的记录'}
                      onClick={() => onDeleteRecord(r.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
              {r.body && (
                <p>
                  <RecordText text={r.body} />
                </p>
              )}
              {r.stageDone && r.stageEmoji && (
                <Decoration value={r.stageEmoji} className="stage-sticker" />
              )}
              <PhotoStrip ids={r.photoIds} />
            </li>
          ))}
        </ol>
        {records.length > limit && (
          <Button variant="outline" onClick={() => setLimit((n) => n + 30)}>
            再翻 30 条
          </Button>
        )}
        <div className="detail-ending">
          {memory ? (
            <>
              <Button variant="outline" onClick={onRestore}>
                <RotateCcw />
                回到生活继续
              </Button>
              <Button onClick={onNewSeason}>再来一期</Button>
            </>
          ) : (
            <Button
              variant={completed(card) ? 'default' : 'ghost'}
              onClick={onArchive}
            >
              <Archive />
              {completed(card) ? '做到了，收进纪念册' : '把这一段收好'}
            </Button>
          )}
        </div>
        {memory && (
          <Button
            className="memory-delete danger-text"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 />
            删除这段纪念
          </Button>
        )}
      </div>
    </Sheet>
  );
}
export function ArchiveForm({
  card,
  onClose,
  onSave,
}: {
  card: LifeCard;
  onClose: () => void;
  onSave: (summary: string, ending: 'achieved' | 'closed') => void;
}) {
  const [summary, setSummary] = useState('');
  const [ending, setEnding] = useState<'achieved' | 'closed'>(
    completed(card) || card.kind === 'blank' ? 'achieved' : 'closed',
  );
  return (
    <Sheet title="给这一段留个纪念" description={card.title} onClose={onClose}>
      <form
        className="life-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(summary, ending);
          onClose();
        }}
      >
        <div className="segmented">
          <button
            type="button"
            aria-pressed={ending === 'achieved'}
            onClick={() => setEnding('achieved')}
          >
            愿望实现了
          </button>
          <button
            type="button"
            aria-pressed={ending === 'closed'}
            onClick={() => setEnding('closed')}
          >
            先告一段落
          </button>
        </div>
        <label>
          想对自己说的话 <small>可选</small>
          <textarea
            rows={4}
            placeholder="回过头看，这一路有什么想记住的？"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>
        <p className="field-hint">
          所有记录和照片都会一起留下，也可以恢复后继续。
        </p>
        <Button type="submit" className="form-submit">
          收进纪念册
        </Button>
      </form>
    </Sheet>
  );
}
