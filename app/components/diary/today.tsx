'use client';

import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import {
  ArrowLeft,
  BookHeart,
  Check,
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
  onOpenDiary,
}: {
  state: AppState;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAdd: () => void;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (task: DailyTask) => void;
  onOpenDiary: () => void;
}) {
  const today = dateKey();
  const tomorrow = moveDate(today, 1);
  const isTomorrow = selectedDate === tomorrow;
  const tasks = state.dailyTasks.filter((task) => task.date === selectedDate);
  const completed = tasks.filter((task) => task.done).length;
  const entry = state.diaries.find((item) => item.date === selectedDate);

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
          <div className="task-list">
            {tasks.map((task) => (
              <div
                className={`task-row ${task.done ? 'is-done' : ''}`}
                key={task.id}
              >
                <button
                  className="task-check-area"
                  type="button"
                  onClick={() => onToggle(task.id, !task.done)}
                  aria-label={`${task.done ? '取消完成' : '完成'}${task.title}`}
                >
                  <span className="task-emoji" aria-hidden="true">
                    {task.emoji}
                  </span>
                  <span className="task-title">{task.title}</span>
                </button>
                <Checkbox
                  checked={task.done}
                  onCheckedChange={(checked) =>
                    onToggle(task.id, checked === true)
                  }
                  aria-label={`完成${task.title}`}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`编辑${task.title}`}
                  onClick={() => onEdit(task)}
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
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

      {!isTomorrow && (
        <button className="journal-peek" type="button" onClick={onOpenDiary}>
          <span className="journal-peek-icon">
            <BookHeart aria-hidden="true" />
          </span>
          <span>
            <small>给今天留几句话</small>
            <strong>
              {entry?.body.trim()
                ? entry.body.slice(0, 18)
                : '今天还没有写日记'}
            </strong>
          </span>
          <span className="journal-prompt">
            {entry ? '继续写' : '去写写'} <ChevronRight aria-hidden="true" />
          </span>
        </button>
      )}
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
  onAddTask,
  onSaveCommon,
  onDeleteCommon,
}: {
  state: AppState;
  selectedDate: string;
  open: boolean;
  mode: 'add' | 'manage';
  onModeChange: (mode: 'add' | 'manage') => void;
  onOpenChange: (open: boolean) => void;
  onAddTask: (emoji: string, title: string, sourceId?: string) => void;
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

  function submitTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onAddTask(emoji, title);
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
    <Drawer open={open} onOpenChange={onOpenChange}>
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
                ? '点一下常用事项，或者临时写一件。'
                : '常做的事留在这里，以后一点就能加入。'}
            </DrawerDescription>
          </DrawerHeader>

          {mode === 'add' ? (
            <>
              <div className="quick-grid">
                {state.commonItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="quick-item"
                    onClick={() => {
                      onAddTask(item.emoji, item.title, item.id);
                      onOpenChange(false);
                    }}
                  >
                    <span>{item.emoji}</span>
                    {item.title}
                  </Button>
                ))}
              </div>
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
