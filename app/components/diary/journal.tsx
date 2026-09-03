'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { zhCN } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  ListPlus,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { dateKey, formatFullDate, fromDateKey, moveDate } from '@/lib/date';
import { getPhotos } from '@/lib/db';
import type { AppState, DiaryEntry } from '@/lib/types';

export function JournalView({
  state,
  selectedDate,
  onDateChange,
  onUpdate,
  onAddPhotos,
  onRemovePhoto,
  onDelete,
}: {
  state: AppState;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onUpdate: (date: string, patch: Partial<DiaryEntry>) => void;
  onAddPhotos: (date: string, files: FileList | null) => void;
  onRemovePhoto: (date: string, id: string) => void;
  onDelete: (entry: DiaryEntry) => void;
}) {
  const entry = state.diaries.find((item) => item.date === selectedDate);
  const taskSnapshots = entry?.taskSnapshots ?? [];
  const dayTasks = state.dailyTasks.filter(
    (task) => task.date === selectedDate,
  );
  const hasEntry =
    !!entry &&
    !!(
      entry.body ||
      entry.mood ||
      entry.photoIds.length ||
      taskSnapshots.length
    );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(fromDateKey(selectedDate));
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const photoIds = entry?.photoIds ?? [];
  const photoKey = photoIds.join('|');

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    const ids = photoKey ? photoKey.split('|') : [];
    void getPhotos(ids)
      .then((photos) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        photos.forEach((photo) => {
          const url = URL.createObjectURL(photo.blob);
          urls.push(url);
          map[photo.id] = url;
        });
        setPhotoUrls(map);
      })
      .catch(() => setPhotoUrls({}));
    return () => {
      alive = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoKey]);

  const toggleTaskSnapshot = (taskId: string, included: boolean) => {
    const task = dayTasks.find((item) => item.id === taskId);
    if (!task) return;
    const next = included
      ? [
          ...taskSnapshots.filter((item) => item.sourceTaskId !== task.id),
          {
            id: `snapshot-${task.id}`,
            sourceTaskId: task.id,
            emoji: task.emoji,
            title: task.title,
            done: task.done,
          },
        ]
      : taskSnapshots.filter((item) => item.sourceTaskId !== task.id);
    onUpdate(selectedDate, { taskSnapshots: next });
  };

  return (
    <div className="view-stack journal-view">
      <section className="journal-date-nav">
        <Button
          variant="ghost"
          size="icon"
          aria-label="前一天"
          onClick={() => onDateChange(moveDate(selectedDate, -1))}
        >
          <ArrowLeft />
        </Button>
        <button
          className="journal-date-trigger"
          type="button"
          onClick={() => {
            setCalendarMonth(fromDateKey(selectedDate));
            setCalendarOpen(true);
          }}
        >
          <CalendarDays aria-hidden="true" />
          <span>
            <strong>{formatFullDate(selectedDate)}</strong>
            <small>
              {selectedDate === dateKey()
                ? '今天 · 点开日历'
                : '点开日历翻看以前'}
            </small>
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="后一天"
          disabled={selectedDate >= dateKey()}
          onClick={() => onDateChange(moveDate(selectedDate, 1))}
        >
          <ArrowRight />
        </Button>
      </section>

      <Drawer open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DrawerContent className="sheet-drawer calendar-drawer">
          <div className="drawer-inner">
            <DrawerHeader>
              <DrawerTitle>翻一翻以前的日记</DrawerTitle>
              <DrawerDescription>
                有粉色小点的日子，已经留下过一页。
              </DrawerDescription>
            </DrawerHeader>
            <Calendar
              mode="single"
              locale={zhCN}
              selected={fromDateKey(selectedDate)}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              disabled={{ after: fromDateKey(dateKey()) }}
              modifiers={{
                hasDiary: state.diaries
                  .filter(
                    (item) => item.body || item.mood || item.photoIds.length,
                  )
                  .map((item) => fromDateKey(item.date)),
              }}
              modifiersClassNames={{ hasDiary: 'has-diary' }}
              onSelect={(date) => {
                if (!date) return;
                onDateChange(dateKey(date));
                setCalendarOpen(false);
              }}
            />
            <RecentDiaryList
              entries={state.diaries}
              onSelect={(date) => {
                onDateChange(date);
                setCalendarOpen(false);
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {(dayTasks.length > 0 || taskSnapshots.length > 0) && (
        <section className="diary-task-section">
          <div className="diary-task-heading">
            <h2>今日小事</h2>
            <Button variant="outline" onClick={() => setTaskPickerOpen(true)}>
              <ListPlus />
              选择
            </Button>
          </div>
          {taskSnapshots.length > 0 && (
            <ul>
              {taskSnapshots.map((item) => (
                <li key={item.id}>
                  <span>{item.emoji}</span>
                  <strong>{item.title}</strong>
                  <i>{item.done ? '已完成' : '未完成'}</i>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="journal-paper">
        <textarea
          value={entry?.body ?? ''}
          onChange={(event) =>
            onUpdate(selectedDate, { body: event.target.value })
          }
          maxLength={12000}
          aria-label="日记正文"
        />
        <span className="journal-word-count">{entry?.body.length ?? 0} 字</span>
      </section>

      <Drawer open={taskPickerOpen} onOpenChange={setTaskPickerOpen}>
        <DrawerContent className="sheet-drawer">
          <div className="drawer-inner diary-task-picker">
            <DrawerHeader>
              <DrawerTitle>收进这一天的小事</DrawerTitle>
              <DrawerDescription>
                这里只留下一份当时的记录，以后修改事项不会改动日记。
              </DrawerDescription>
            </DrawerHeader>
            <div>
              {dayTasks.map((task) => {
                const included = taskSnapshots.some(
                  (item) => item.sourceTaskId === task.id,
                );
                return (
                  <label key={task.id}>
                    <span>{task.emoji}</span>
                    <strong>{task.title}</strong>
                    <Checkbox
                      checked={included}
                      onCheckedChange={(checked) =>
                        toggleTaskSnapshot(task.id, checked === true)
                      }
                    />
                  </label>
                );
              })}
            </div>
            <Button onClick={() => setTaskPickerOpen(false)}>选好了</Button>
          </div>
        </DrawerContent>
      </Drawer>

      <section className="photo-section">
        <div className="photo-heading">
          <div>
            <h2>今天的画面</h2>
            <p>最多 9 张，只保存在本机。</p>
          </div>
          <label className="photo-add">
            <Camera />
            <span>添加照片</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                onAddPhotos(selectedDate, event.target.files);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        {photoIds.length > 0 && (
          <div className="photo-grid">
            {photoIds.map((id) => (
              <figure key={id}>
                {photoUrls[id] ? (
                  <Image
                    src={photoUrls[id]}
                    alt="日记照片"
                    fill
                    sizes="(max-width: 560px) 30vw, 160px"
                    unoptimized
                  />
                ) : (
                  <span className="photo-loading">
                    <ImageIcon />
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label="删除照片"
                  onClick={() => onRemovePhoto(selectedDate, id)}
                >
                  <X />
                </Button>
              </figure>
            ))}
          </div>
        )}
      </section>

      {entry && hasEntry && (
        <div className="journal-page-tools">
          <Button
            variant="ghost"
            className="journal-delete"
            onClick={() => onDelete(entry)}
          >
            <Trash2 />
            删除本页
          </Button>
        </div>
      )}

      <BilibiliTags />
    </div>
  );
}

function RecentDiaryList({
  entries,
  onSelect,
}: {
  entries: DiaryEntry[];
  onSelect: (date: string) => void;
}) {
  const recent = entries
    .filter(
      (entry) =>
        entry.body.trim() ||
        entry.mood ||
        entry.photoIds.length ||
        entry.taskSnapshots.length,
    )
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 5);

  return (
    <section className="recent-diaries">
      <h3>最近写过</h3>
      {recent.length ? (
        <div>
          {recent.map((entry) => {
            return (
              <button
                type="button"
                key={entry.date}
                onClick={() => onSelect(entry.date)}
              >
                <span>📖</span>
                <span>
                  <strong>{formatFullDate(entry.date)}</strong>
                  <small>
                    {entry.body.trim().slice(0, 24) ||
                      (entry.photoIds.length
                        ? `${entry.photoIds.length} 张照片`
                        : `${entry.taskSnapshots.length} 件小事`)}
                  </small>
                </span>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      ) : (
        <p>还没有过去的日记。写下第一页后，它会留在这里。</p>
      )}
    </section>
  );
}

function BilibiliTags() {
  const tags = [
    {
      name: '贝极星空间站的日常',
      href: 'https://www.bilibili.com/v/topic/detail?topic_id=32780',
      color: 'bella',
    },
    {
      name: '嘉心糖的手帐本',
      href: 'https://www.bilibili.com/v/topic/detail?topic_id=36443',
      color: 'jiaran',
    },
    {
      name: '乃琳夸夸群',
      href: 'https://www.bilibili.com/v/topic/detail?topic_id=9825',
      color: 'nailin',
    },
  ];

  return (
    <section className="bili-tags">
      <p className="section-kicker">A-SOUL TAG</p>
      <div>
        {tags.map((tag) => (
          <a
            className={tag.color}
            href={tag.href}
            target="_blank"
            rel="noreferrer"
            key={tag.href}
          >
            <Heart />
            {tag.name}
            <ChevronRight />
          </a>
        ))}
      </div>
    </section>
  );
}
