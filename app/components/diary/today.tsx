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
import { dateKey } from '@/lib/date';
import type { AppState, CommonItem, DailyTask } from '@/lib/types';

export function TodayView({
  state,
  onAdd,
  onToggle,
  onEdit,
  onOpenDiary,
}: {
  state: AppState;
  onAdd: () => void;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (task: DailyTask) => void;
  onOpenDiary: () => void;
}) {
  const today = dateKey();
  const tasks = state.dailyTasks.filter((task) => task.date === today);
  const completed = tasks.filter((task) => task.done).length;
  const entry = state.diaries.find((item) => item.date === today);

  return (
    <div className="view-stack today-view">
      <section className="hero-copy">
        <p className="hand-note">今天这一页</p>
        <h1>今天，想做点什么？</h1>
        <p>选几件真正想做的小事，完成了就轻轻打个勾。</p>
      </section>

      <section className="paper-card today-card" aria-labelledby="today-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">TODAY</p>
            <h2 id="today-heading">今天要做</h2>
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
              <div className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}>
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
                  onCheckedChange={(checked) => onToggle(task.id, checked === true)}
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
            <strong>今天还没有安排</strong>
            <p>不用列很长，先放进一件想做的小事。</p>
          </div>
        )}

        <Button className="add-today-button" size="lg" onClick={onAdd}>
          <Plus aria-hidden="true" />添加今天要做的事
        </Button>
      </section>

      <button className="journal-peek" type="button" onClick={onOpenDiary}>
        <span className="journal-peek-icon">
          <BookHeart aria-hidden="true" />
        </span>
        <span>
          <small>给今天留几句话</small>
          <strong>{entry?.body.trim() ? entry.body.slice(0, 18) : '今天还没有写日记'}</strong>
        </span>
        <span className="journal-prompt">
          {entry ? '继续写' : '去写写'} <ChevronRight aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}

export function TodayDrawer({
  state,
  open,
  mode,
  onModeChange,
  onOpenChange,
  onAddTask,
  onSaveCommon,
  onDeleteCommon,
}: {
  state: AppState;
  open: boolean;
  mode: 'add' | 'manage';
  onModeChange: (mode: 'add' | 'manage') => void;
  onOpenChange: (open: boolean) => void;
  onAddTask: (emoji: string, title: string, sourceId?: string) => void;
  onSaveCommon: (item: Pick<CommonItem, 'emoji' | 'title'>, id?: string) => void;
  onDeleteCommon: (item: CommonItem) => void;
}) {
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
            <DrawerTitle>{mode === 'add' ? '今天想做什么？' : '管理常用事项'}</DrawerTitle>
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
                    <span>{item.emoji}</span>{item.title}
                  </Button>
                ))}
              </div>
              <p className="or-divider"><span>或者临时写一件</span></p>
              <form className="stack-form" onSubmit={submitTask}>
                <div className="emoji-title-fields">
                  <Input
                    aria-label="表情"
                    value={emoji}
                    onChange={(event) => setEmoji(event.target.value.slice(0, 4))}
                  />
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="例如：练琴 30 分钟"
                    maxLength={50}
                  />
                </div>
                <Button type="submit" size="lg" disabled={!title.trim()}>添加到今天</Button>
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
                    onChange={(event) => setEmoji(event.target.value.slice(0, 4))}
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
              <Button variant="ghost" className="manage-common" onClick={() => onModeChange('add')}>
                <ArrowLeft aria-hidden="true" />返回添加今日事项
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
              <DrawerTitle>修改今天这件事</DrawerTitle>
              <DrawerDescription>只修改今天，不会影响常用事项。</DrawerDescription>
            </DrawerHeader>
            <div className="emoji-title-fields">
              <Input
                aria-label="表情"
                value={task.emoji}
                onChange={(event) => onChange({ ...task, emoji: event.target.value.slice(0, 4) })}
              />
              <Input
                value={task.title}
                onChange={(event) => onChange({ ...task, title: event.target.value })}
                maxLength={50}
              />
            </div>
            <Button type="submit" disabled={!task.title.trim()}>保存修改</Button>
            <Button type="button" variant="ghost" className="danger-text" onClick={() => onDelete(task)}>
              <Trash2 aria-hidden="true" />删除这条
            </Button>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}

