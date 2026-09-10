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
import { progressEventDate } from '@/lib/progress';

const shortRangeDate = (date: string) => {
  const value = fromDateKey(date);
  return `${value.getMonth() + 1}/${value.getDate()}`;
};

export function ChallengeChart({
  goal,
}: {
  goal: ProgressGoal | ProgressMemory;
}) {
  const [view, setView] = useState<'date' | 'overview'>('date');
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
        <div className="record-ring-track" style={{ background: gradient }}>
          <div className="record-ring-hatch" style={{ maskImage: hatchMask }} />
        </div>
        {showTarget && (
          <svg
            className="record-ring-marker"
            viewBox="0 0 220 220"
            aria-hidden="true"
          >
            <line
              x1={110 + Math.sin(angle) * 91}
              y1={110 - Math.cos(angle) * 91}
              x2={110 + Math.sin(angle) * 100}
              y2={110 - Math.cos(angle) * 100}
            />
            <text
              x={Math.max(24, Math.min(196, 110 + Math.sin(angle) * 106))}
              y={Math.max(8, Math.min(210, 110 - Math.cos(angle) * 107))}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {target} 天
            </text>
          </svg>
        )}
        <div className="record-ring-center">
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
            <span key={state.id}>
              <i style={{ background: state.color }} />
              {state.name}
              <b>{stats.counts[state.id]}</b>
            </span>
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
    outcome: ChallengeOutcome,
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
      <ChallengeChart goal={goal} />
      <ProgressDatePicker
        goal={goal}
        date={date}
        onDateChange={onDateChange}
        onOpen={() => onOpenHistory(goal.id)}
      />
      <ChallengeEntry
        key={`${date}:${event?.createdAt ?? ''}`}
        goal={goal}
        date={date}
        allowed={allowed}
        outcome={event?.outcome}
        initialNote={event?.note ?? ''}
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
  onRecord,
  onAdjust,
}: {
  goal: ProgressGoal;
  date: string;
  allowed: boolean;
  outcome?: ChallengeOutcome;
  initialNote: string;
  onRecord: (
    id: string,
    date: string,
    outcome: ChallengeOutcome,
    note?: string,
  ) => void;
  onAdjust: (id: string, delta: number, note?: string, date?: string) => void;
}) {
  const [note, setNote] = useState(initialNote);
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
            onClick={() => onRecord(goal.id, date, status.id, note)}
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
      <details className="challenge-note">
        <summary>
          <NotebookPen />
          {initialNote ? '查看 / 修改这天的话' : '留一句话（可选）'}
        </summary>
        <Input
          aria-label="挑战足迹内容"
          maxLength={100}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="今天的感受，或新的约定"
        />
        <div className="challenge-note-actions">
          {outcome && (
            <Button
              variant="ghost"
              onClick={() => onRecord(goal.id, date, outcome, note)}
            >
              保存到这天
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={!allowed || !note.trim()}
            onClick={() => {
              onAdjust(goal.id, 0, note, date);
              setNote('');
            }}
          >
            只留文字足迹
          </Button>
        </div>
      </details>
    </div>
  );
}
