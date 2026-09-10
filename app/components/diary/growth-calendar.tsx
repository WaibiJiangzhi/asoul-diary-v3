'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { zhCN } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  challengeDays,
  challengeEnd,
  progressEventLabel,
  recordStates,
} from '@/lib/challenge';
import { dateKey, formatShortDate, fromDateKey, moveDate } from '@/lib/date';
import { progressEventDate } from '@/lib/progress';
import type { ProgressGoal, ProgressEvent } from '@/lib/types';

export function ProgressDatePicker({
  goal,
  date,
  onDateChange,
  onOpen,
}: {
  goal: ProgressGoal;
  date: string;
  onDateChange: (date: string) => void;
  onOpen: () => void;
}) {
  const today = dateKey();
  const earliest = goal.challenge?.startDate;
  const latest =
    goal.challenge && challengeEnd(goal) < today ? challengeEnd(goal) : today;
  return (
    <div className="progress-date-picker">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="记录前一天"
        disabled={!!earliest && date <= earliest}
        onClick={() => onDateChange(moveDate(date, -1))}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="ghost"
        className="progress-date-open"
        onClick={onOpen}
        aria-label={`打开记录日历，当前 ${date}`}
      >
        <CalendarDays />
        <span>{date === today ? '今天' : formatShortDate(date)}</span>
        <small>{date === today ? formatShortDate(date) : '补记 / 查看'}</small>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="记录后一天"
        disabled={date >= latest}
        onClick={() => onDateChange(moveDate(date, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export function ProgressHistoryDrawer({
  goal,
  date,
  onDateChange,
  onOpenChange,
  onDelete,
}: {
  goal: ProgressGoal;
  date: string;
  onDateChange: (date: string) => void;
  onOpenChange: (open: boolean) => void;
  onDelete: (goal: ProgressGoal, event: ProgressEvent) => void;
}) {
  const [month, setMonth] = useState(fromDateKey(date));
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const [all, setAll] = useState(false);
  const today = dateKey();
  const outcomes = new Map(
    challengeDays(goal).map((event) => [event.date!, event.outcome]),
  );
  const states = recordStates(goal);
  const byDate = new Map<string, ProgressEvent[]>();
  for (const event of goal.events) {
    const key = progressEventDate(event);
    byDate.set(key, [...(byDate.get(key) ?? []), event]);
  }
  const events = [...goal.events]
    .filter((event) => all || progressEventDate(event) === date)
    .sort(
      (a, b) =>
        progressEventDate(b).localeCompare(progressEventDate(a)) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  const dayEvents = byDate.get(date) ?? [];
  const dayDelta = Number(
    dayEvents.reduce((sum, event) => sum + event.delta, 0).toFixed(4),
  );
  const allowed =
    date <= today &&
    (!goal.challenge ||
      (date >= goal.challenge.startDate && date <= challengeEnd(goal)));
  const status = goal.challenge
    ? (states.find((state) => state.id === outcomes.get(date))?.name ??
      '还没有记录结果')
    : dayEvents.length
      ? `这天 ${dayDelta > 0 ? '+' : ''}${dayDelta} ${goal.unit}`
      : '这天还没有足迹';
  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onOpenChange(false);
      }}
    >
      <DrawerContent className="sheet-drawer tall history-drawer">
        <div
          className="drawer-inner growth-history growth-calendar"
          style={{ '--card-accent': goal.color } as CSSProperties}
        >
          <DrawerHeader>
            <DrawerTitle>日历与足迹</DrawerTitle>
            <DrawerDescription>{goal.title}</DrawerDescription>
          </DrawerHeader>
          <Calendar
            className="diary-calendar"
            mode="single"
            locale={zhCN}
            month={month}
            onMonthChange={setMonth}
            selected={fromDateKey(date)}
            disabled={(day) =>
              dateKey(day) > today ||
              (!!goal.challenge &&
                (dateKey(day) < goal.challenge.startDate ||
                  dateKey(day) > challengeEnd(goal)))
            }
            onSelect={(day) => {
              if (day) {
                onDateChange(dateKey(day));
                setAll(false);
              }
            }}
            components={{
              DayButton: (props) => {
                const key = dateKey(props.day.date);
                const entries = byDate.get(key) ?? [];
                const outcome = outcomes.get(key);
                const state = states.find((state) => state.id === outcome);
                const amount = Number(
                  entries.reduce((sum, e) => sum + e.delta, 0).toFixed(4),
                );
                const description = outcome
                  ? (state?.name ?? '未设置状态')
                  : entries.length
                    ? goal.challenge
                      ? '有文字足迹'
                      : `${amount > 0 ? '+' : ''}${amount} ${goal.unit}`
                    : '未记录';
                return (
                  <CalendarDayButton
                    {...props}
                    className={`record-calendar-day ${entries.length ? 'has-recording' : ''} ${goal.challenge && !outcome ? 'text-only' : ''}`}
                    style={
                      {
                        '--record-day-color': state?.color ?? goal.color,
                      } as CSSProperties
                    }
                    locale={zhCN}
                    aria-label={`${key}，${description}`}
                  />
                );
              },
            }}
          />
          <div className="growth-calendar-legend">
            {goal.challenge ? (
              states.map((state) => (
                <span key={state.id}>
                  <i style={{ background: state.color }} />
                  {state.name}
                </span>
              ))
            ) : (
              <span>
                <i className="is-done" />
                有记录
              </span>
            )}
            {goal.challenge && (
              <span>
                <i className="is-noted" />
                文字足迹
              </span>
            )}
          </div>
          <div className="growth-day-heading">
            <div>
              <strong>{formatShortDate(date)}</strong>
              <small>{status}</small>
            </div>
            <Button
              size="sm"
              disabled={!allowed}
              onClick={() => setOpen(false)}
            >
              记录这一天
            </Button>
          </div>
          <fieldset className="growth-history-filter" aria-label="足迹范围">
            <Button
              variant="ghost"
              aria-pressed={!all}
              onClick={() => setAll(false)}
            >
              当天足迹 · {dayEvents.length}
            </Button>
            <Button
              variant="ghost"
              aria-pressed={all}
              onClick={() => setAll(true)}
            >
              全部足迹 · {goal.events.length}
            </Button>
          </fieldset>
          {events.length ? (
            <ol className="growth-history-list progress-history-list">
              {events.map((event) => (
                <li key={event.id}>
                  <span className="footstep-copy">
                    <time>{formatShortDate(progressEventDate(event))}</time>
                    {event.note && <strong>{event.note}</strong>}
                    {event.rule && <small>当时的约定：{event.rule}</small>}
                  </span>
                  <span className="history-value">
                    <b
                      style={
                        event.outcome
                          ? {
                              color: states.find(
                                (state) => state.id === event.outcome,
                              )?.color,
                            }
                          : undefined
                      }
                      className={
                        event.outcome
                          ? 'record-result'
                          : event.delta >= 0
                            ? 'positive'
                            : 'negative'
                      }
                    >
                      {progressEventLabel(goal, event)}
                    </b>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除${progressEventDate(event)}的${progressEventLabel(goal, event)}足迹`}
                    onClick={() => onDelete(goal, event)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="history-empty">
              {all
                ? '还没有成长足迹'
                : goal.challenge
                  ? '这天也值得被记下'
                  : '一点点积累，都可以留在这里'}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
