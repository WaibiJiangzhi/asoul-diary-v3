'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
import type {
  CardColor,
  Countdown,
  DiaryGrowthSnapshot,
  GrowthMemory,
  ProgressGoal,
} from '@/lib/types';
import { CARD_COLORS } from './constants';
import { Decoration } from './decoration';

export function JournalView({
  state,
  selectedDate,
  onDateChange,
  onUpdate,
  onAddPhotos,
  onRemovePhoto,
  onDelete,
  onSetDateMarker,
}: {
  state: AppState;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onUpdate: (date: string, patch: Partial<DiaryEntry>) => void;
  onAddPhotos: (date: string, files: FileList | null) => void;
  onRemovePhoto: (date: string, id: string) => void;
  onDelete: (entry: DiaryEntry) => void;
  onSetDateMarker: (date: string, color: CardColor | null) => void;
}) {
  const entry = state.diaries.find((item) => item.date === selectedDate);
  const taskSnapshots = entry?.taskSnapshots ?? [];
  const growthSnapshots = entry?.growthSnapshots ?? [];
  const dayTasks = state.dailyTasks.filter(
    (task) => task.date === selectedDate,
  );
  const hasEntry =
    !!entry &&
    !!(
      entry.body ||
      entry.mood ||
      entry.photoIds.length ||
      taskSnapshots.length ||
      growthSnapshots.length
    );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<
    'tasks' | 'countdowns' | 'progress'
  >('tasks');
  const [calendarMonth, setCalendarMonth] = useState(fromDateKey(selectedDate));
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const photoIds = entry?.photoIds ?? [];
  const photoKey = photoIds.join('|');
  const activePhotoIndex = activePhotoId ? photoIds.indexOf(activePhotoId) : -1;
  const activePhotoUrl = activePhotoId ? photoUrls[activePhotoId] : undefined;
  const selectedMarker = state.dateMarkers.find(
    (marker) => marker.date === selectedDate,
  );
  const { countdownSources, progressSources } = useMemo(() => {
    const archivedOnSelectedDate = state.memories.filter(
      (memory) => dateKey(new Date(memory.endedAt)) === selectedDate,
    );
    return {
      countdownSources: [
        ...state.countdowns,
        ...archivedOnSelectedDate.filter(
          (memory) => memory.kind === 'countdown',
        ),
      ] as (Countdown | GrowthMemory)[],
      progressSources: [
        ...state.progressGoals,
        ...archivedOnSelectedDate.filter(
          (memory) => memory.kind === 'progress',
        ),
      ] as (ProgressGoal | GrowthMemory)[],
    };
  }, [selectedDate, state.countdowns, state.memories, state.progressGoals]);
  const markerModifiers = useMemo(
    () =>
      Object.fromEntries(
        CARD_COLORS.map((color, index) => [
          `dateMarker${index}`,
          state.dateMarkers
            .filter((marker) => marker.color === color.value)
            .map((marker) => fromDateKey(marker.date)),
        ]),
      ),
    [state.dateMarkers],
  );

  const moveActivePhoto = (direction: -1 | 1) => {
    if (!photoIds.length) return;
    const currentIndex = Math.max(0, activePhotoIndex);
    const nextIndex =
      (currentIndex + direction + photoIds.length) % photoIds.length;
    setActivePhotoId(photoIds[nextIndex]);
  };

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

  const toggleGrowthSnapshot = (
    item: Countdown | ProgressGoal | GrowthMemory,
    included: boolean,
  ) => {
    const sourceId =
      item.kind === 'countdown' && 'sourceCountdownId' in item
        ? item.sourceCountdownId
        : item.kind === 'progress' && 'sourceGoalId' in item
          ? item.sourceGoalId
          : item.id;
    const id = `growth-snapshot-${sourceId}`;
    let snapshot: DiaryGrowthSnapshot;
    if (item.kind === 'countdown') {
      const selectedTime = fromDateKey(selectedDate).getTime();
      const targetTime = fromDateKey(item.targetDate).getTime();
      const sameDayNotes = item.notes.filter(
        (note) => dateKey(new Date(note.createdAt)) === selectedDate,
      );
      snapshot = {
        id,
        kind: 'countdown',
        sourceId,
        emoji: item.emoji,
        title: item.title,
        remainingDays: Math.ceil((targetTime - selectedTime) / 86_400_000),
        note: sameDayNotes.at(-1)?.text ?? '',
        capturedAt: new Date().toISOString(),
      };
    } else {
      const sameDayEvents = item.events.filter(
        (event) => dateKey(new Date(event.createdAt)) === selectedDate,
      );
      snapshot = {
        id,
        kind: 'progress',
        sourceId,
        emoji: item.emoji,
        title: item.title,
        delta: Number(
          sameDayEvents.reduce((sum, event) => sum + event.delta, 0).toFixed(4),
        ),
        current: sameDayEvents.at(-1)?.valueAfter ?? item.current,
        total: item.total,
        unit: item.unit,
        note:
          [...sameDayEvents].reverse().find((event) => event.note)?.note ?? '',
        capturedAt: new Date().toISOString(),
      };
    }
    const next = included
      ? [
          ...growthSnapshots.filter((entry) => entry.sourceId !== sourceId),
          snapshot,
        ]
      : growthSnapshots.filter((entry) => entry.sourceId !== sourceId);
    onUpdate(selectedDate, { growthSnapshots: next });
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
              <DrawerDescription className="sr-only">
                选择日期或给特别的日子做颜色标记。
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
                    (item) =>
                      item.body ||
                      item.mood ||
                      item.photoIds.length ||
                      item.taskSnapshots.length ||
                      item.growthSnapshots.length,
                  )
                  .map((item) => fromDateKey(item.date)),
                ...markerModifiers,
              }}
              modifiersClassNames={{
                hasDiary: 'has-diary',
                ...Object.fromEntries(
                  CARD_COLORS.map((_, index) => [
                    `dateMarker${index}`,
                    `date-marker-${index}`,
                  ]),
                ),
              }}
              onSelect={(date) => {
                if (!date) return;
                onDateChange(dateKey(date));
                setCalendarOpen(false);
              }}
            />
            <fieldset className="calendar-marker-picker">
              <legend>标记 {formatFullDate(selectedDate)}</legend>
              <div>
                {CARD_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={
                      selectedMarker?.color === color.value ? 'active' : ''
                    }
                    style={{ background: color.value }}
                    aria-label={`用${color.label}标记这一天`}
                    onClick={() => onSetDateMarker(selectedDate, color.value)}
                  />
                ))}
                <button
                  type="button"
                  className="clear-marker"
                  disabled={!selectedMarker}
                  onClick={() => onSetDateMarker(selectedDate, null)}
                >
                  清除
                </button>
              </div>
            </fieldset>
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

      <section className="diary-task-section">
        <div className="diary-task-heading">
          <h2>今日小事</h2>
          <Button variant="outline" onClick={() => setTaskPickerOpen(true)}>
            <ListPlus />
            选择
          </Button>
        </div>
        {(taskSnapshots.length > 0 || growthSnapshots.length > 0) && (
          <ul>
            {taskSnapshots.map((item) => (
              <li key={item.id}>
                <span>{item.emoji}</span>
                <strong>{item.title}</strong>
                <i>{item.done ? '已完成' : '未完成'}</i>
              </li>
            ))}
            {growthSnapshots.map((item) => (
              <li
                className={`diary-growth-snapshot ${item.emoji ? '' : 'no-decoration'}`}
                key={item.id}
              >
                <Decoration value={item.emoji} alt="成长记录表情" />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.kind === 'countdown'
                      ? item.remainingDays >= 0
                        ? `还有 ${item.remainingDays} 天`
                        : `已经过去 ${Math.abs(item.remainingDays)} 天`
                      : `今天 ${item.delta >= 0 ? '+' : ''}${item.delta} ${item.unit} · ${item.current}/${item.total}`}
                    {item.note ? ` · ${item.note}` : ''}
                  </small>
                </span>
                <i>{item.kind === 'countdown' ? '倒计时' : '进度'}</i>
              </li>
            ))}
          </ul>
        )}
      </section>

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
              <DrawerDescription className="sr-only">
                选择要保存到日记的事项或成长记录。
              </DrawerDescription>
            </DrawerHeader>
            <div className="segmented diary-picker-tabs">
              <button
                type="button"
                className={pickerTab === 'tasks' ? 'active' : ''}
                onClick={() => setPickerTab('tasks')}
              >
                今日事项
              </button>
              <button
                type="button"
                className={pickerTab === 'countdowns' ? 'active' : ''}
                onClick={() => setPickerTab('countdowns')}
              >
                倒计时
              </button>
              <button
                type="button"
                className={pickerTab === 'progress' ? 'active' : ''}
                onClick={() => setPickerTab('progress')}
              >
                进度
              </button>
            </div>
            <div className="diary-picker-options">
              {pickerTab === 'tasks' &&
                dayTasks.map((task) => {
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
              {pickerTab === 'countdowns' &&
                countdownSources.map((item) => {
                  const sourceId =
                    'sourceCountdownId' in item
                      ? item.sourceCountdownId
                      : item.id;
                  const included = growthSnapshots.some(
                    (entry) => entry.sourceId === sourceId,
                  );
                  return (
                    <label
                      className={item.emoji ? '' : 'no-decoration'}
                      key={`${item.id}:${sourceId}`}
                    >
                      <Decoration value={item.emoji} alt="倒计时表情" />
                      <strong>{item.title}</strong>
                      <Checkbox
                        checked={included}
                        onCheckedChange={(checked) =>
                          toggleGrowthSnapshot(item, checked === true)
                        }
                      />
                    </label>
                  );
                })}
              {pickerTab === 'progress' &&
                progressSources.map((item) => {
                  const sourceId =
                    'sourceGoalId' in item ? item.sourceGoalId : item.id;
                  const included = growthSnapshots.some(
                    (entry) => entry.sourceId === sourceId,
                  );
                  return (
                    <label
                      className={item.emoji ? '' : 'no-decoration'}
                      key={`${item.id}:${sourceId}`}
                    >
                      <Decoration value={item.emoji} alt="进度表情" />
                      <strong>{item.title}</strong>
                      <Checkbox
                        checked={included}
                        onCheckedChange={(checked) =>
                          toggleGrowthSnapshot(item, checked === true)
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
            {photoIds.map((id, index) => (
              <figure key={id}>
                {photoUrls[id] ? (
                  <button
                    className="photo-open"
                    type="button"
                    aria-label={`查看第 ${index + 1} 张照片`}
                    onClick={() => setActivePhotoId(id)}
                  >
                    <Image
                      src={photoUrls[id]}
                      alt="日记照片"
                      fill
                      sizes="(max-width: 560px) 30vw, 160px"
                      unoptimized
                    />
                  </button>
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

      <Dialog
        open={!!activePhotoUrl}
        onOpenChange={(open) => !open && setActivePhotoId(null)}
      >
        <DialogContent
          className="photo-viewer"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">查看日记照片</DialogTitle>
          {activePhotoUrl && (
            <div className="photo-viewer-stage">
              <Image
                src={activePhotoUrl}
                alt={`第 ${activePhotoIndex + 1} 张日记照片`}
                fill
                sizes="100vw"
                unoptimized
              />
            </div>
          )}
          <Button
            className="photo-viewer-close"
            variant="secondary"
            size="icon"
            aria-label="关闭照片"
            onClick={() => setActivePhotoId(null)}
          >
            <X />
          </Button>
          {photoIds.length > 1 && (
            <>
              <Button
                className="photo-viewer-previous"
                variant="secondary"
                size="icon"
                aria-label="上一张照片"
                onClick={() => moveActivePhoto(-1)}
              >
                <ArrowLeft />
              </Button>
              <Button
                className="photo-viewer-next"
                variant="secondary"
                size="icon"
                aria-label="下一张照片"
                onClick={() => moveActivePhoto(1)}
              >
                <ArrowRight />
              </Button>
            </>
          )}
          <span className="photo-viewer-count">
            {activePhotoIndex + 1} / {photoIds.length}
          </span>
        </DialogContent>
      </Dialog>

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
  const recent = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.body.trim() ||
            entry.mood ||
            entry.photoIds.length ||
            entry.taskSnapshots.length ||
            entry.growthSnapshots.length,
        )
        .sort((first, second) => second.date.localeCompare(first.date))
        .slice(0, 5),
    [entries],
  );

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
                <span>📒</span>
                <span>
                  <strong>{formatFullDate(entry.date)}</strong>
                  <small>
                    {entry.body.trim().slice(0, 24) ||
                      (entry.photoIds.length
                        ? `${entry.photoIds.length} 张照片`
                        : `${entry.taskSnapshots.length + entry.growthSnapshots.length} 件小事`)}
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
      name: '嘉心糖的手帐本',
      href: 'https://www.bilibili.com/v/topic/detail?topic_id=36443',
      color: 'jiaran',
    },
    {
      name: '贝极星空间站的日常',
      href: 'https://www.bilibili.com/v/topic/detail?topic_id=32780',
      color: 'bella',
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
