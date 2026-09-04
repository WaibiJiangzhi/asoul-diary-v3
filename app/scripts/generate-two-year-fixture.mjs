import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DAY = 86_400_000;
const colors = [
  '#E799B0',
  '#DB7D74',
  '#576690',
  '#D8946B',
  '#C89B4B',
  '#6F9A76',
  '#5B9292',
  '#8B78A8',
  '#84787E',
];
const emojis = ['✨', '🌱', '☀️', '🌙', '🍀', '🎧', '🎹', '🏃', '📒'];
const taskTitles = [
  '读二十页书',
  '散步半小时',
  '早点休息',
  '练琴',
  '整理房间',
  '复盘今天',
  '认真吃饭',
  '给家里打电话',
];
const diaryLines = [
  '今天把想做的小事一点点做完了，普通的一天也值得记住。',
  '路上风很舒服，回家时顺手拍下了晚霞。',
  '没有追求完美，只是比昨天多向前走了一小步。',
  '忙碌里也留了一点时间给自己，心情慢慢安静下来。',
  '听着歌把事情收尾，明天也继续好好生活。',
  '今天有一点累，不过仍然发生了几件让人开心的小事。',
];

let seed = 20260904;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (values) => values[Math.floor(random() * values.length)];
const pad = (value) => String(value).padStart(2, '0');
const key = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const isoAt = (date, hour = 21, minute = 30) => {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
};
const addDays = (date, amount) => new Date(date.getTime() + amount * DAY);
const id = (prefix, value) => `${prefix}-fixture-${value}`;

const today = new Date();
today.setHours(0, 0, 0, 0);
const firstDay = addDays(today, -729);
const diaries = [];
const photos = [];
const dateMarkers = [];

for (let index = 0; index < 730; index += 1) {
  const day = addDays(firstDay, index);
  const date = key(day);
  const taskCount = 1 + Math.floor(random() * 4);
  const taskSnapshots = Array.from({ length: taskCount }, (_, taskIndex) => ({
    id: id('snapshot', `${index}-${taskIndex}`),
    sourceTaskId: id('task', `${index}-${taskIndex}`),
    emoji: pick(emojis),
    title: pick(taskTitles),
    done: random() > 0.22,
  }));
  const growthSnapshots = [];
  if (index % 4 === 0) {
    const current = 1200 + index * 17;
    growthSnapshots.push({
      id: id('growth-snapshot', `run-${index}`),
      kind: 'progress',
      sourceId: 'goal-fixture-running',
      emoji: '🏃',
      title: '年度跑量',
      delta: 3 + (index % 8),
      current,
      total: 10000,
      unit: 'km',
      note: index % 12 === 0 ? '今天的风很适合慢跑。' : '',
      capturedAt: isoAt(day, 20, 18),
    });
  }
  if (index % 11 === 0) {
    growthSnapshots.push({
      id: id('growth-snapshot', `countdown-${index}`),
      kind: 'countdown',
      sourceId: 'countdown-fixture-live',
      emoji: '⭐',
      title: '期待见面的日子',
      remainingDays: 60 - (index % 60),
      note: index % 22 === 0 ? '又靠近了一天。' : '',
      capturedAt: isoAt(day, 20, 20),
    });
  }

  const photoIds = [];
  if (index % 37 === 0) {
    const photoId = id('photo', index);
    const color = colors[index % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#fffaf7"/><circle cx="450" cy="500" r="260" fill="${color}" opacity=".42"/><text x="450" y="910" text-anchor="middle" font-family="sans-serif" font-size="52" fill="#4a424b">${date}</text><text x="450" y="990" text-anchor="middle" font-family="sans-serif" font-size="38" fill="#6f6570">今天的画面</text></svg>`;
    photos.push({
      id: photoId,
      dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      name: `${date}-fixture.svg`,
      createdAt: isoAt(day, 18, 0),
    });
    photoIds.push(photoId);
  }

  const wroteBody = random() > 0.26;
  diaries.push({
    date,
    mood: pick(['happy', 'good', 'plain', 'plain', 'good', '']),
    body: wroteBody
      ? `${pick(diaryLines)}\n${index % 9 === 0 ? pick(diaryLines) : ''}`.trim()
      : '',
    photoIds,
    taskSnapshots,
    growthSnapshots,
    createdAt: isoAt(day, 21, 12),
    updatedAt: isoAt(day, 22, 8),
  });
  if (index % 17 === 0) {
    dateMarkers.push({ date, color: colors[index % colors.length] });
  }
}

const progressEvents = Array.from({ length: 180 }, (_, index) => {
  const day = addDays(today, -179 + index);
  const delta = 4 + (index % 9);
  return {
    id: id('event', `active-${index}`),
    delta,
    valueAfter: 2400 + index * 37 + delta,
    note: index % 8 === 0 ? '按自己的节奏继续。' : '',
    createdAt: isoAt(day, 20, index % 60),
  };
});

const memories = Array.from({ length: 42 }, (_, index) => {
  const ended = addDays(today, -20 - index * 15);
  const started = addDays(ended, -45 - (index % 30));
  if (index % 3 === 0) {
    return {
      id: id('memory', index),
      kind: 'countdown',
      sourceCountdownId: id('countdown', index),
      emoji: index % 2 ? '✨' : '',
      title: `第 ${index + 1} 个期待的日子`,
      targetDate: key(ended),
      note: '等待本身也在发光。',
      notes: Array.from({ length: 5 }, (_, noteIndex) => ({
        id: id('countdown-note', `${index}-${noteIndex}`),
        text: `离期待的日子又近了一点 · ${noteIndex + 1}`,
        createdAt: isoAt(addDays(started, noteIndex * 8), 21, 0),
      })),
      color: colors[index % colors.length],
      startedAt: isoAt(started, 8, 0),
      endedAt: isoAt(ended, 22, 0),
      endedEarly: false,
    };
  }
  const total = 30 + (index % 5) * 20;
  const eventCount = 8 + (index % 13);
  let running = 0;
  const events = Array.from({ length: eventCount }, (_, eventIndex) => {
    const delta = Math.ceil(total / eventCount);
    running += delta;
    return {
      id: id('event', `${index}-${eventIndex}`),
      delta,
      valueAfter: running,
      note: eventIndex % 5 === 0 ? '记住这一步。' : '',
      createdAt: isoAt(addDays(started, eventIndex * 3), 20, eventIndex),
    };
  });
  return {
    id: id('memory', index),
    kind: 'progress',
    sourceGoalId: id('goal', index),
    emoji: pick(emojis),
    title: `成长计划 ${index + 1}`,
    current: running,
    total,
    unit: index % 2 ? '次' : '页',
    note: '这段认真走过的路，值得被记住。',
    color: colors[index % colors.length],
    completedNaturally: running >= total,
    startedAt: isoAt(started, 8, 0),
    endedAt: isoAt(ended, 22, 0),
    events,
  };
});

const currentDates = [-1, 0, 1];
const dailyTasks = currentDates.flatMap((offset) => {
  const date = key(addDays(today, offset));
  return taskTitles.slice(0, 5).map((title, index) => ({
    id: id('task', `${date}-${index}`),
    date,
    emoji: emojis[index],
    title,
    done: offset < 0 || (offset === 0 && index < 2),
    sourceCommonId: id('common', index),
    createdAt: isoAt(addDays(today, offset), 8, index),
    updatedAt: isoAt(addDays(today, offset), 18, index),
  }));
});

const backup = {
  product: 'asoul-diary-v3',
  exportedAt: new Date().toISOString(),
  state: {
    version: 4,
    commonItems: taskTitles.map((title, index) => ({
      id: id('common', index),
      emoji: emojis[index],
      title,
      createdAt: isoAt(firstDay, 9, index),
      updatedAt: isoAt(today, 9, index),
    })),
    dailyTasks,
    countdowns: [
      {
        id: 'countdown-fixture-live',
        kind: 'countdown',
        emoji: '/stickers/jiaran-2026/jiaran-05.gif',
        title: '期待见面的日子',
        targetDate: key(addDays(today, 28)),
        note: '把期待慢慢写下来。',
        notes: Array.from({ length: 16 }, (_, index) => ({
          id: id('countdown-note', `live-${index}`),
          text: index % 3 === 0 ? '今天也很期待。' : '又靠近了一天。',
          createdAt: isoAt(addDays(today, -index * 3), 21, index),
        })),
        color: '#E799B0',
        createdAt: isoAt(addDays(today, -60), 9, 0),
        updatedAt: isoAt(today, 21, 0),
      },
    ],
    progressGoals: [
      {
        id: 'goal-fixture-running',
        kind: 'progress',
        emoji: '/stickers/jiaran-2026/jiaran-12.gif',
        title: '年度跑量',
        current: progressEvents.at(-1).valueAfter,
        total: 8000,
        unit: 'km',
        step: 5,
        note: '慢慢跑，也是在向前。',
        color: '#576690',
        events: progressEvents,
        createdAt: isoAt(addDays(today, -200), 8, 0),
        updatedAt: isoAt(today, 20, 0),
      },
    ],
    memories,
    diaries,
    dateMarkers,
    settings: {
      theme: 'paper',
      accent: 'jiaran',
      wallpaper: '/wallpapers/jiaran-1.webp',
      wallpaperCatalogVersion: 3,
      haptics: true,
      sounds: true,
    },
  },
  photos,
};

const outputDirectory = join(process.cwd(), 'fixtures');
await mkdir(outputDirectory, { recursive: true });
const output = join(outputDirectory, 'two-years-sample-backup.json');
await writeFile(output, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
console.log(`Generated ${output}`);
console.log(
  `${diaries.length} diaries, ${memories.length} memories, ${dateMarkers.length} markers, ${photos.length} photos`,
);
