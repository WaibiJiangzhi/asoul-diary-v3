'use client';

import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
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
  const tomorrow = moveDate(today, 1);
  const isTomorrow = selectedDate === tomorrow;
  const tasks = state.dailyTasks.filter((task) => task.date === selectedDate);
  const activeTasks = tasks.filter((task) => !task.done);
  const completedTasks = tasks.filter((task) => task.done);
  const completed = completedTasks.length;
  const [completedOpen, setCompletedOpen] = useState(false);
  const [finishingIds, setFinishingIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const finishingTimers = useRef(new Map<string, number>());
  const longPressTimer = useRef<number | null>(null);
  const dragState = useRef<{
    id: string;
    startY: number;
    active: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  useEffect(
    () => () => {
      finishingTimers.current.forEach((timer) => window.clearTimeout(timer));
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    },
    [],
  );

  function requestToggle(task: DailyTask) {
    if (suppressClick.current) return;
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

  function startLongPress(
    event: ReactPointerEvent<HTMLDivElement>,
    task: DailyTask,
  ) {
    if (
      task.done ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest('[data-no-drag]')
    )
      return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    dragState.current = { id: task.id, startY: event.clientY, active: false };
    const control = event.currentTarget;
    const pointerId = event.pointerId;
    longPressTimer.current = window.setTimeout(() => {
      if (!dragState.current || dragState.current.id !== task.id) return;
      dragState.current.active = true;
      suppressClick.current = true;
      setDraggingId(task.id);
      control.setPointerCapture?.(pointerId);
      if (state.settings.haptics) navigator.vibrate?.(12);
    }, 320);
  }

  function moveLongPress(event: ReactPointerEvent<HTMLDivElement>) {
    const current = dragState.current;
    if (!current) return;
    if (!current.active) {
      if (Math.abs(event.clientY - current.startY) > 8) {
        if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        dragState.current = null;
      }
      return;
    }
    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-task-id]');
    const targetId = target?.dataset.taskId;
    if (targetId && targetId !== current.id) onReorder(current.id, targetId);
  }

  function finishLongPress() {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    const wasDragging = dragState.current?.active === true;
    dragState.current = null;
    setDraggingId(null);
    if (wasDragging) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
  }

  function renderTask(task: DailyTask) {
    const isFinishing = finishingIds.has(task.id);
    return (
      <div
        className={`task-row ${task.done ? 'is-done' : ''} ${isFinishing ? 'is-finishing' : ''} ${draggingId === task.id ? 'is-dragging' : ''}`}
        key={task.id}
        data-task-id={task.id}
        onPointerDown={(event) => startLongPress(event, task)}
        onPointerMove={moveLongPress}
        onPointerUp={finishLongPress}
        onPointerCancel={finishLongPress}
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
      <section className="day-switcher" aria-label="选择今天或明天">
        <button
          type="button"
          className={!isTomorrow ? 'active' : ''}
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
              {isTomorrow ? 'TOMORROW' : 'TODAY'}
            </p>
            <h2 id="today-heading">{isTomorrow ? '明天要做' : '今天要做'}</h2>
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
              <div className="task-list">{activeTasks.map(renderTask)}</div>
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
                    {completedTasks.map(renderTask)}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <div className="gentle-empty">
            <span>🍵</span>
            <strong>{isTomorrow ? '明天还没有安排' : '今天还没有安排'}</strong>
            <p>
              {isTomorrow
                ? '先写下一件明天想做的小事。'
                : '不用列很长，先放进一件想做的小事。'}
            </p>
          </div>
        )}

        <Button className="add-today-button" size="lg" onClick={onAdd}>
          <Plus aria-hidden="true" />
          添加{isTomorrow ? '明天' : '今天'}要做的事
        </Button>
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
}) {
  const isTomorrow = selectedDate === moveDate(dateKey(), 1);
  const [emoji, setEmoji] = useState('🌱');
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<CommonItem | null>(null);
  const [selectedCommonIds, setSelectedCommonIds] = useState<Set<string>>(
    new Set(),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSelectedCommonIds(new Set());
    onOpenChange(nextOpen);
  }

  function submitTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onAddTasks([{ emoji, title }]);
    setTitle('');
    onOpenChange(false);
  }

  function submitCommon(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSaveCommon({ emoji, title }, editing?.id);
    setTitle('');
    setEmoji('🌱');
    setEditing(null);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="sheet-drawer">
        <div className="drawer-inner">
          <DrawerHeader>
            <DrawerTitle>
              {mode === 'add'
                ? `${isTomorrow ? '明天' : '今天'}想做什么？`
                : '管理常用事项'}
            </DrawerTitle>
            <DrawerDescription>
              {mode === 'add'
                ? `可以连续选择几项，再一次放进${isTomorrow ? '明天' : '今天'}。`
                : '常做的事留在这里，以后一点就能加入。'}
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
                    placeholder="例如：练琴 30 分钟"
                    maxLength={50}
                  />
                </div>
                <Button type="submit" size="lg" disabled={!title.trim()}>
                  添加到{isTomorrow ? '明天' : '今天'}
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
              <div className="manage-list">
                {state.commonItems.map((item) => (
                  <div className="manage-row" key={item.id}>
                    <span>{item.emoji}</span>
                    <strong>{item.title}</strong>
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
                ))}
              </div>
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
                修改{task.date === moveDate(dateKey(), 1) ? '明天' : '今天'}
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
