'use client';

/* oxlint-disable react/react-compiler -- sortable activator refs are supplied by dnd-kit during render. */

import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  SyntheticEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { dateKey, formatShortDate, moveDate } from '@/lib/date';
import type { AppState, CommonItem, DailyTask } from '@/lib/types';
import { pickDailyEmoji } from './constants';
import { SortableList, type SortableHandle } from './sortable-list';

export function TodayView({
  state,
  selectedDate,
  onDateChange,
  onAdd,
  onToggle,
  onEdit,
  onReorder,
}: {
  state: AppState;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAdd: () => void;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (task: DailyTask) => void;
  onReorder: (draggedId: string, targetId: string) => void;
}) {
  const today = dateKey();
  const yesterday = moveDate(today, -1);
  const tomorrow = moveDate(today, 1);
  const isYesterday = selectedDate === yesterday;
  const isTomorrow = selectedDate === tomorrow;
  const dayLabel = isYesterday ? '昨天' : isTomorrow ? '明天' : '今天';
  const tasks = state.dailyTasks.filter((task) => task.date === selectedDate);
  const activeTasks = tasks.filter((task) => !task.done);
  const completedTasks = tasks.filter((task) => task.done);
  const completed = completedTasks.length;
  const [completedOpen, setCompletedOpen] = useState(false);
  const [finishingIds, setFinishingIds] = useState<Set<string>>(new Set());
  const finishingTimers = useRef(new Map<string, number>());

  useEffect(
    () => () => {
      finishingTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  function requestToggle(task: DailyTask) {
    if (finishingIds.has(task.id)) return;
    if (task.done) {
      onToggle(task.id, false);
      return;
    }
    setFinishingIds((current) => new Set(current).add(task.id));
    const timer = window.setTimeout(() => {
      onToggle(task.id, true);
      setFinishingIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
      finishingTimers.current.delete(task.id);
    }, 280);
    finishingTimers.current.set(task.id, timer);
  }

  function renderTask(
    task: DailyTask,
    dragHandle?: ReactNode,
    isDragging = false,
  ) {
    const isFinishing = finishingIds.has(task.id);
    return (
      <div
        className={`task-row ${task.done ? 'is-done' : ''} ${isFinishing ? 'is-finishing' : ''} ${dragHandle ? 'has-sort-handle' : ''} ${isDragging ? 'is-dragging' : ''}`}
        key={task.id}
      >
        <button
          className="task-check-area"
          type="button"
          onClick={() => requestToggle(task)}
          aria-label={`${task.done ? '取消完成' : '完成'}${task.title}`}
        >
          <span className="task-emoji" aria-hidden="true">
            {task.emoji}
          </span>
          <span className="task-title">{task.title}</span>
        </button>
        <Checkbox
          data-no-drag
          checked={task.done || isFinishing}
          disabled={isFinishing}
          onCheckedChange={(checked) =>
            checked === true ? requestToggle(task) : onToggle(task.id, false)
          }
          aria-label={`完成${task.title}`}
        />
        {dragHandle}
        <Button
          data-no-drag
          variant="ghost"
          size="icon-sm"
          aria-label={`编辑${task.title}`}
          onClick={() => onEdit(task)}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="view-stack today-view">
      <section className="day-switcher" aria-label="选择昨天、今天或明天">
        <button
          type="button"
          className={isYesterday ? 'active' : ''}
          onClick={() => onDateChange(yesterday)}
        >
          <strong>昨天</strong>
          <small>{formatShortDate(yesterday)}</small>
        </button>
        <button
          type="button"
          className={!isYesterday && !isTomorrow ? 'active' : ''}
          onClick={() => onDateChange(today)}
        >
          <strong>今天</strong>
          <small>{formatShortDate(today)}</small>
        </button>
        <button
          type="button"
          className={isTomorrow ? 'active' : ''}
          onClick={() => onDateChange(tomorrow)}
        >
          <strong>明天</strong>
          <small>{formatShortDate(tomorrow)}</small>
        </button>
      </section>

      <section className="today-section" aria-labelledby="today-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">
              {isYesterday ? 'YESTERDAY' : isTomorrow ? 'TOMORROW' : 'TODAY'}
            </p>
            <h2 id="today-heading">{dayLabel}要做</h2>
          </div>
          {!!tasks.length && (
            <span className="progress-stamp">
              <Check aria-hidden="true" /> {completed}/{tasks.length}
            </span>
          )}
        </div>

        {tasks.length ? (
          <>
            {activeTasks.length ? (
              <SortableList
                ids={activeTasks.map((task) => task.id)}
                className="task-list"
                onReorder={onReorder}
                onDragStart={() => {
                  if (state.settings.haptics) navigator.vibrate?.(12);
                }}
              >
                {(id, handle, isDragging) => {
                  const task = activeTasks.find((item) => item.id === id)!;
                  return renderTask(
                    task,
                    <SortHandle
                      handle={handle}
                      label={`拖动${task.title}排序`}
                    />,
                    isDragging,
                  );
                }}
              </SortableList>
            ) : (
              <p className="all-done-note">
                {isTomorrow
                  ? '明天安排的小事都完成了'
                  : '今天想做的小事都完成了'}{' '}
                ✓
              </p>
            )}
            {!!completedTasks.length && (
              <section className="completed-tasks">
                <button
                  type="button"
                  aria-expanded={completedOpen}
                  onClick={() => setCompletedOpen((current) => !current)}
                >
                  <span>
                    <Check /> 已完成 {completedTasks.length} 项
                  </span>
                  <ChevronDown />
                </button>
                {completedOpen && (
                  <div className="task-list completed-list">
                    {completedTasks.map((task) => renderTask(task))}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <div className="gentle-empty">
            <span>✨</span>
            <strong>{dayLabel}还没有安排</strong>
          </div>
        )}

        <Button className="add-today-button" size="lg" onClick={onAdd}>
          <Plus aria-hidden="true" />
          添加{dayLabel}要做的事
        </Button>
        <p className="today-retention-note">
          每日事项只保留到次日结束，想长期留下可以收进日记。
        </p>
      </section>
    </div>
  );
}

export function TodayDrawer({
  state,
  selectedDate,
  open,
  mode,
  onModeChange,
  onOpenChange,
  onAddTasks,
  onSaveCommon,
  onDeleteCommon,
  onReorderCommon,
}: {
  state: AppState;
  selectedDate: string;
  open: boolean;
  mode: 'add' | 'manage';
  onModeChange: (mode: 'add' | 'manage') => void;
  onOpenChange: (open: boolean) => void;
  onAddTasks: (
    items: { emoji: string; title: string; sourceId?: string }[],
  ) => void;
  onSaveCommon: (
    item: Pick<CommonItem, 'emoji' | 'title'>,
    id?: string,
  ) => void;
  onDeleteCommon: (item: CommonItem) => void;
  onReorderCommon: (draggedId: string, targetId: string) => void;
}) {
  const isTomorrow = selectedDate === moveDate(dateKey(), 1);
  const isYesterday = selectedDate === moveDate(dateKey(), -1);
  const dayLabel = isYesterday ? '昨天' : isTomorrow ? '明天' : '今天';
  const [emoji, setEmoji] = useState<string>('✨');
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<CommonItem | null>(null);
  const [selectedCommonIds, setSelectedCommonIds] = useState<Set<string>>(
    new Set(),
  );
  const [sorting, setSorting] = useState(false);

  useEffect(() => {
    if (open) setEmoji(pickDailyEmoji());
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSorting(false);
      setSelectedCommonIds(new Set());
      setTitle('');
      setEmoji(pickDailyEmoji());
      setEditing(null);
    }
    onOpenChange(nextOpen);
  }

  function submitTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onAddTasks([{ emoji, title }]);
    setTitle('');
    setEmoji(pickDailyEmoji());
    onOpenChange(false);
  }

  function submitCommon(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSaveCommon({ emoji, title }, editing?.id);
    setTitle('');
    setEmoji(pickDailyEmoji());
    setEditing(null);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (sorting && details.reason === 'swipe') return;
        handleOpenChange(nextOpen);
      }}
    >
      <DrawerContent
        className={`sheet-drawer ${sorting ? 'sorting-inside' : ''}`}
      >
        <div className="drawer-inner">
          <DrawerHeader>
            <DrawerTitle>
              {mode === 'add' ? `${dayLabel}想做什么？` : '管理常用事项'}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              选择或编辑事项
            </DrawerDescription>
          </DrawerHeader>

          {mode === 'add' ? (
            <>
              <div className="quick-list" aria-label="选择常用事项">
                {state.commonItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`quick-item ${selectedCommonIds.has(item.id) ? 'is-selected' : ''}`}
                    aria-pressed={selectedCommonIds.has(item.id)}
                    onClick={() => {
                      setSelectedCommonIds((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                  >
                    <span className="quick-item-emoji">{item.emoji}</span>
                    <strong>{item.title}</strong>
                    <i>{selectedCommonIds.has(item.id) && <Check />}</i>
                  </button>
                ))}
              </div>
              {!!state.commonItems.length && (
                <Button
                  type="button"
                  size="lg"
                  className="batch-add-button"
                  disabled={!selectedCommonIds.size}
                  onClick={() => {
                    onAddTasks(
                      state.commonItems
                        .filter((item) => selectedCommonIds.has(item.id))
                        .map((item) => ({
                          emoji: item.emoji,
                          title: item.title,
                          sourceId: item.id,
                        })),
                    );
                    setSelectedCommonIds(new Set());
                    onOpenChange(false);
                  }}
                >
                  添加已选 {selectedCommonIds.size} 项
                </Button>
              )}
              <p className="or-divider">
                <span>或者临时写一件</span>
              </p>
              <form className="stack-form" onSubmit={submitTask}>
                <div className="emoji-title-fields">
                  <Input
                    aria-label="表情"
                    value={emoji}
                    onChange={(event) =>
                      setEmoji(event.target.value.slice(0, 4))
                    }
                  />
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="写下一件小事"
                    maxLength={50}
                  />
                </div>
                <Button type="submit" size="lg" disabled={!title.trim()}>
                  添加到{dayLabel}
                </Button>
              </form>
              <Button
                variant="ghost"
                className="manage-common"
                onClick={() => {
                  setTitle('');
                  setSelectedCommonIds(new Set());
                  onModeChange('manage');
                }}
              >
                管理常用事项 <ChevronRight aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <form className="stack-form" onSubmit={submitCommon}>
                <div className="emoji-title-fields">
                  <Input
                    aria-label="表情"
                    value={emoji}
                    onChange={(event) =>
                      setEmoji(event.target.value.slice(0, 4))
                    }
                  />
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="常用事项名称"
                    maxLength={30}
                  />
                </div>
                <Button type="submit" disabled={!title.trim()}>
                  {editing ? '保存修改' : '新增常用事项'}
                </Button>
              </form>
              <SortableList
                ids={state.commonItems.map((item) => item.id)}
                className="manage-list"
                onReorder={onReorderCommon}
                onDragStart={() => {
                  if (state.settings.haptics) navigator.vibrate?.(12);
                }}
                onDraggingChange={setSorting}
              >
                {(id, handle, isDragging) => {
                  const item = state.commonItems.find(
                    (common) => common.id === id,
                  )!;
                  return (
                    <div
                      className={`manage-row ${isDragging ? 'is-dragging' : ''}`}
                    >
                      <span>{item.emoji}</span>
                      <strong>{item.title}</strong>
                      <SortHandle
                        handle={handle}
                        label={`拖动${item.title}排序`}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`编辑${item.title}`}
                        onClick={() => {
                          setEditing(item);
                          setEmoji(item.emoji);
                          setTitle(item.title);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`删除${item.title}`}
                        onClick={() => onDeleteCommon(item)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                }}
              </SortableList>
              <Button
                variant="ghost"
                className="manage-common"
                onClick={() => onModeChange('add')}
              >
                <ArrowLeft aria-hidden="true" />
                返回添加今日事项
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SortHandle({
  handle,
  label,
}: {
  handle: SortableHandle;
  label: string;
}) {
  const pointerDown = handle.listeners?.onPointerDown;
  const touchStart = handle.listeners?.onTouchStart;
  return (
    <Button
      ref={handle.setActivatorNodeRef}
      variant="ghost"
      size="icon-sm"
      className="sort-handle"
      aria-label={label}
      {...handle.attributes}
      {...handle.listeners}
      onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
        pointerDown?.(event);
        event.stopPropagation();
      }}
      onTouchStart={(event: ReactTouchEvent<HTMLButtonElement>) => {
        touchStart?.(event);
        event.stopPropagation();
      }}
    >
      <GripVertical aria-hidden="true" />
    </Button>
  );
}

export function TaskEditDrawer({
  task,
  onChange,
  onSave,
  onDelete,
}: {
  task: DailyTask | null;
  onChange: (task: DailyTask | null) => void;
  onSave: (event: SyntheticEvent<HTMLFormElement>) => void;
  onDelete: (task: DailyTask) => void;
}) {
  return (
    <Drawer open={!!task} onOpenChange={(open) => !open && onChange(null)}>
      <DrawerContent className="sheet-drawer">
        {task && (
          <form className="drawer-inner stack-form" onSubmit={onSave}>
            <DrawerHeader>
              <DrawerTitle>
                修改
                {task.date === moveDate(dateKey(), -1)
                  ? '昨天'
                  : task.date === moveDate(dateKey(), 1)
                    ? '明天'
                    : '今天'}
                这件事
              </DrawerTitle>
              <DrawerDescription>
                只修改这一天，不会影响常用事项。
              </DrawerDescription>
            </DrawerHeader>
            <div className="emoji-title-fields">
              <Input
                aria-label="表情"
                value={task.emoji}
                onChange={(event) =>
                  onChange({ ...task, emoji: event.target.value.slice(0, 4) })
                }
              />
              <Input
                value={task.title}
                onChange={(event) =>
                  onChange({ ...task, title: event.target.value })
                }
                maxLength={50}
              />
            </div>
            <Button type="submit" disabled={!task.title.trim()}>
              保存修改
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="danger-text"
              onClick={() => onDelete(task)}
            >
              <Trash2 aria-hidden="true" />
              删除这条
            </Button>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
