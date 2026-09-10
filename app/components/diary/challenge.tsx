'use client';

import { useState, type CSSProperties } from 'react';
import {
  Archive,
  ChevronRight,
  Footprints,
  NotebookPen,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  canRecordChallenge,
  challengeDays,
  challengeEnd,
  challengeStats,
  challengeSegments,
  recordStates,
  type ChallengeOutcome,
} from '@/lib/challenge';
import { dateKey, fromDateKey } from '@/lib/date';
import type { ProgressGoal, ProgressMemory } from '@/lib/types';
import { Decoration } from './decoration';
import { ProgressDatePicker } from './growth-calendar';
import { useRingReveal } from '@/hooks/use-ring-reveal';
import { progressEventDate } from '@/lib/progress';

const shortRangeDate = (date: string) => {
  const value = fromDateKey(date);
  return `${value.getMonth() + 1}/${value.getDate()}`;
};

export function ChallengeChart({
  goal,
  active = true,
}: {
  goal: ProgressGoal | ProgressMemory;
  active?: boolean;
}) {
  const [view, setView] = useState<'date' | 'overview'>('date');
  const reveal = useRingReveal(view, active);
  const stats = challengeStats(goal);
  const states = recordStates(goal);
  const target = goal.challenge!.targetDays;
  const targetState = states.find(
    (state) => state.id === goal.challenge!.targetStateId,
  );
  const showTarget = view === 'overview' && !!target && !!targetState;
  const segments = challengeSegments(goal, view);
  const stops: { color: string; start: number; end: number; empty: boolean }[] =
    [];
  let offset = 0;
  for (const segment of segments) {
    const start = (offset / goal.total) * 100;
    const end = ((offset + segment.days) / goal.total) * 100;
    const color =
      states.find((state) => state.id === segment.stateId)?.color ??
      (segment.stateId === 'future'
        ? 'var(--ring-future)'
        : 'var(--ring-unrecorded)');
    stops.push({ color, start, end, empty: segment.stateId === 'unrecorded' });
    offset += segment.days;
  }
  const gradient =
    stops.length === 1
      ? stops[0].color
      : `conic-gradient(${stops.map((stop) => `${stop.color} ${stop.start}% ${stop.end}%`).join(',')})`;
  const hatchMask = `conic-gradient(${stops.map((stop) => `${stop.empty ? 'black' : 'transparent'} ${stop.start}% ${stop.end}%`).join(',')})`;
  const angle = ((target ?? 0) / goal.total) * Math.PI * 2;
  const overview = challengeSegments(goal, 'overview');
  return (
    <div className="challenge-chart">
      <div className="challenge-chart-toolbar">
        <span className="challenge-date-range">
          {shortRangeDate(goal.challenge!.startDate)}—
          {shortRangeDate(challengeEnd(goal))}
        </span>
        <fieldset className="challenge-view-switch" aria-label="圆环视图">
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
        </fieldset>
      </div>
      <figure
        className="record-ring"
        aria-label={`已记录 ${stats.recorded}/${goal.total} 天，${states.map((state) => `${state.name} ${stats.counts[state.id]} 天`).join('，')}${targetState && target ? `，期待${targetState.name} ${target} 天` : ''}`}
      >
        <div className="record-ring-reveal" ref={reveal} aria-hidden="true">
          <div className="record-ring-track" style={{ background: gradient }}>
            <div
              className="record-ring-hatch"
              style={{ maskImage: hatchMask }}
            />
          </div>
        </div>
        {showTarget && (
          <svg
            className="record-ring-marker"
            viewBox="0 0 260 260"
            aria-hidden="true"
          >
            <line
              x1={130 + Math.sin(angle) * 104}
              y1={130 - Math.cos(angle) * 104}
              x2={130 + Math.sin(angle) * 114}
              y2={130 - Math.cos(angle) * 114}
            />
            <text
              x={Math.max(30, Math.min(230, 130 + Math.sin(angle) * 114))}
              y={Math.max(
                8,
                Math.min(
                  252,
                  130 -
                    Math.cos(angle) * 114 +
                    (Math.cos(angle) > 0 ? -14 : 14),
                ),
              )}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {target} 天
            </text>
          </svg>
        )}
        <div
          className="record-ring-center"
          key={goal.events.map((event) => event.createdAt).join()}
        >
          <strong className={String(goal.total).length > 3 ? 'is-long' : ''}>
            {showTarget ? stats.targetCount : stats.recorded}
            <small> / {showTarget ? target : goal.total}</small>
          </strong>
          <span>
            {showTarget ? targetState.name : '天已记录'}
            {showTarget && stats.targetCount >= target! ? ' ✓' : ''}
          </span>
        </div>
      </figure>
      {view === 'overview' && (
        <div className="record-overview-legend">
          {states.map((state) => (
            <div className="record-legend-item" key={state.id}>
              <span className="record-legend-badge">
                {state.emoji ? (
                  <Decoration
                    value={state.emoji}
                    className="record-legend-image"
                  />
                ) : (
                  <i style={{ background: state.color }} />
                )}
              </span>
              <span className="record-legend-name">{state.name}</span>
              <b>
                {stats.counts[state.id]}
                <small> 天</small>
              </b>
            </div>
          ))}
        </div>
      )}
      <div className="record-empty-legend">
        <span>
          <i className="is-unrecorded" />
          待记录{' '}
          {overview.find((segment) => segment.stateId === 'unrecorded')?.days ??
            0}
        </span>
        <span>
          <i className="is-future" />
          未来{' '}
          {overview.find((segment) => segment.stateId === 'future')?.days ?? 0}
        </span>
      </div>
    </div>
  );
}

export function ChallengeCard({
  date,
  onDateChange,
  goal,
  active,
  onRecord,
  onAdjust,
  onEdit,
  onDelete,
  onArchive,
  onOpenHistory,
}: {
  goal: ProgressGoal;
  active: boolean;
  onRecord: (
    id: string,
    date: string,
    outcome: ChallengeOutcome | null,
    note?: string,
  ) => void;
  onAdjust: (id: string, delta: number, note?: string, date?: string) => void;
  onEdit: (goal: ProgressGoal) => void;
  onDelete: (goal: ProgressGoal) => void;
  onArchive: (goal: ProgressGoal, natural: boolean) => void;
  onOpenHistory: (id: string) => void;
  date: string;
  onDateChange: (date: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const today = dateKey();
  const end = challengeEnd(goal);
  const event = challengeDays(goal).find((entry) => entry.date === date);
  const dayCount = goal.events.filter(
    (entry) => progressEventDate(entry) === date,
  ).length;
  const allowed = canRecordChallenge(goal, date, today);
  const finished = today > end || challengeStats(goal).recorded === goal.total;
  return (
    <article
      className={`paper-card progress-card challenge-card ${active ? 'is-active' : ''}`}
      data-carousel-card
      style={{ '--card-accent': goal.color } as CSSProperties}
    >
      <div className={`goal-top ${goal.emoji ? '' : 'no-decoration'}`}>
        <Decoration
          value={goal.emoji}
          className="goal-emoji"
          alt="圆环卡表情"
        />
        <div className="goal-copy">
          <small>圆环卡 · {goal.total} 天</small>
          <h3>{goal.title}</h3>
          {goal.note && <p>{goal.note}</p>}
        </div>
        <div className="card-tools">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="编辑圆环卡"
            onClick={() => onEdit(goal)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="删除圆环卡"
            onClick={() => onDelete(goal)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <ChallengeChart goal={goal} active={active} />
      <ProgressDatePicker
        goal={goal}
        date={date}
        onDateChange={onDateChange}
        onOpen={() => onOpenHistory(goal.id)}
      />
      <ChallengeEntry
        goal={goal}
        date={date}
        allowed={allowed}
        outcome={event?.outcome}
        initialNote={event?.note ?? ''}
        note={drafts[date] ?? event?.note ?? ''}
        onNoteChange={(value) =>
          setDrafts((current) => {
            const next = { ...current };
            if (value === null) delete next[date];
            else next[date] = value;
            return next;
          })
        }
        onRecord={onRecord}
        onAdjust={onAdjust}
      />
      <Button
        className="history-trigger"
        variant="ghost"
        onClick={() => onOpenHistory(goal.id)}
      >
        <span>
          <Footprints />
          当天足迹 · {dayCount} 条
        </span>
        <ChevronRight />
      </Button>
      <Button
        className={finished ? 'archive-button' : 'finish-early'}
        variant={finished ? 'default' : 'ghost'}
        onClick={() => onArchive(goal, finished)}
      >
        {finished ? <Sparkles /> : <Archive />}
        {finished ? '把这段记录收进纪念册' : '现在结束这段成长'}
      </Button>
    </article>
  );
}

function ChallengeEntry({
  goal,
  date,
  allowed,
  outcome,
  initialNote,
  note,
  onNoteChange,
  onRecord,
  onAdjust,
}: {
  goal: ProgressGoal;
  date: string;
  allowed: boolean;
  outcome?: ChallengeOutcome;
  initialNote: string;
  note: string;
  onNoteChange: (note: string | null) => void;
  onRecord: (
    id: string,
    date: string,
    outcome: ChallengeOutcome | null,
    note?: string,
  ) => void;
  onAdjust: (id: string, delta: number, note?: string, date?: string) => void;
}) {
  return (
    <div className="challenge-entry">
      {!allowed && <p className="challenge-day-status">还没开始，先期待一下</p>}
      <div className="challenge-outcomes">
        {recordStates(goal).map((status) => (
          <Button
            key={status.id}
            className="record-outcome"
            disabled={!allowed}
            aria-pressed={outcome === status.id}
            style={{ '--status-color': status.color } as CSSProperties}
            onClick={() => {
              onRecord(
                goal.id,
                date,
                outcome === status.id ? null : status.id,
                note,
              );
              // Saved words remain in the footstep when the state is cleared.
              if (outcome !== status.id || note === initialNote)
                onNoteChange(null);
            }}
          >
            {status.emoji ? (
              <Decoration
                value={status.emoji}
                className="record-outcome-image"
              />
            ) : (
              <i style={{ background: status.color }} />
            )}
            <span>{status.name}</span>
          </Button>
        ))}
      </div>
      <form
        className="record-note-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!allowed) return;
          if (outcome) {
            onRecord(goal.id, date, outcome, note);
            onNoteChange(null);
          } else if (note.trim()) {
            onAdjust(goal.id, 0, note, date);
            onNoteChange('');
          }
        }}
      >
        <label className="progress-adjust-note">
          <NotebookPen aria-hidden="true" />
          <Input
            aria-label="为这天留一句话（可选）"
            maxLength={100}
            disabled={!allowed}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="留一句话（可选）"
          />
        </label>
        <Button
          type="submit"
          variant="ghost"
          disabled={!allowed || (outcome ? note === initialNote : !note.trim())}
        >
          保存
        </Button>
      </form>
    </div>
  );
}
