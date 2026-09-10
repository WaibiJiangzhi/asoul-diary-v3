import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Keep the two-year browsing fixture, with a coherent, feature-rich recent month.
const root = fileURLToPath(new URL('../', import.meta.url));
const { outputFiles } = await build({
  entryPoints: [join(root, 'lib/defaults.ts')],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { normalizeState } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);
const catalog = JSON.parse(
  await readFile(join(root, 'lib/sticker-catalog.json'), 'utf8'),
);
const tokens = new Set(
  catalog.flatMap((pack) => pack.stickers.map((sticker) => sticker.token)),
);
const stickers = [
  '[2026嘉然的画册_比心]',
  '[2026贝拉的冒险动态表情包_摸脑袋]',
  '[2026乃琳的酒馆_爱你]',
];
for (const token of stickers)
  assert(tokens.has(token), `Missing sticker: ${token}`);
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
const today = new Date();
today.setHours(0, 0, 0, 0);
const day = (offset) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date;
};
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (offset) => {
  const d = day(offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const at = (offset, hour = 8, minute = 0) => {
  const d = day(offset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const uid = (name) => `fixture-${name}`;
const commonItems = [
  ['📖', '读二十页书'],
  ['🏃', '去河边慢跑'],
  [stickers[1], '练琴二十分钟'],
  ['🍀', '整理房间'],
  [stickers[2], '给家里打电话'],
  ['🍚', '认真吃晚饭'],
  [stickers[0], '睡前留一点时间给自己'],
].map(([emoji, title], i) => ({
  id: uid(`common-${i}`),
  emoji,
  title,
  createdAt: at(-729),
  updatedAt: at(-12),
}));
const dailyTasks = [-1, 0, 1].flatMap((offset) => {
  const selected =
    offset === -1 ? [0, 1, 4, 6] : offset === 0 ? [0, 2, 5, 6] : [1, 3, 4];
  return selected.map((index, i) => ({
    id: uid(`task-${offset}-${index}`),
    date: dateKey(offset),
    emoji: commonItems[index].emoji,
    title: commonItems[index].title,
    done: offset === -1 ? i !== 3 : offset === 0 && i < 2,
    sourceCommonId: commonItems[index].id,
    createdAt: at(Math.min(offset, 0), 7),
    updatedAt: at(Math.min(offset, 0), 8),
  }));
});
dailyTasks.push({
  id: uid('task-buy-flowers'),
  date: dateKey(0),
  emoji: '🌷',
  title: '回家路上买一束花',
  done: false,
  createdAt: at(0),
  updatedAt: at(0),
});

function bar(name, title, emoji, total, unit, rows, extra = {}) {
  let current = 0;
  const events = rows.map(([offset, delta, note = '', hour = 7], i) => {
    current = Math.round((current + delta) * 100) / 100;
    return {
      id: uid(`${name}-event-${i}`),
      delta,
      valueAfter: current,
      note,
      date: dateKey(offset),
      createdAt: at(offset, hour, i % 60),
    };
  });
  return {
    id: uid(name),
    kind: 'progress',
    title,
    emoji,
    current,
    total,
    unit,
    step: 1,
    note: '',
    color: colors[0],
    events,
    createdAt: at(rows[0][0], 6),
    updatedAt: events.at(-1).createdAt,
    ...extra,
  };
}
const sleepStates = [
  { id: 'early-early', name: '早睡早起', color: colors[0], emoji: stickers[0] },
  { id: 'early-late', name: '早睡晚起', color: colors[5], emoji: '🌤️' },
  { id: 'late-early', name: '晚睡早起', color: colors[7], emoji: stickers[1] },
  { id: 'late-late', name: '晚睡晚起', color: colors[2], emoji: '🌙' },
];
const walkStates = [
  { id: 'walk', name: '出门走走', color: colors[5], emoji: '🌿' },
  { id: 'rest', name: '在家休息', color: colors[3], emoji: stickers[2] },
];
function ring(name, title, start, total, outcomes, states, targetDays) {
  let count = 0;
  const events = outcomes.flatMap((outcome, i) =>
    outcome === null
      ? []
      : [
          {
            id: uid(`${name}-day-${i}`),
            date: dateKey(start + i),
            outcome: states[outcome].id,
            delta: 1,
            valueAfter: ++count,
            note: i % 6 === 0 ? '今天给自己留了一点余地。' : '',
            createdAt: at(start + i, 7),
          },
        ],
  );
  return {
    id: uid(name),
    kind: 'progress',
    title,
    emoji: states[0].emoji,
    current: count,
    total,
    unit: '天',
    step: 1,
    note: name.includes('sleep')
      ? '00:30 前睡，9:00 前起，慢慢调回来。'
      : '散步也好，休息也好，都记下来。',
    color: states[0].color,
    events,
    createdAt: at(start, 6),
    updatedAt: events.at(-1).createdAt,
    challenge: {
      startDate: dateKey(start),
      states,
      ...(targetDays ? { targetStateId: states[0].id, targetDays } : {}),
    },
  };
}
const running = bar(
  'running',
  '秋天慢慢跑 100 公里',
  '🏃',
  100,
  'km',
  [
    [-27, 3.5, '先从家门口的小圈开始。'],
    [-24, 5],
    [-21, 4.2, '沿着河边跑，晚风很舒服。'],
    [-18, 6],
    [-15, 5.5],
    [-12, 4],
    [-9, 7],
    [-6, 5],
    [-3, 6.3],
    [-1, 4.8, '今天不追配速。'],
    [-1, -0.8, '刚才把热身距离多算了，改一下。', 8],
    [0, 0, '今天休息，给小腿放个假。'],
  ],
  {
    step: 3,
    color: colors[1],
    note: '跑得慢也没关系，能舒服地坚持就很好。',
    expectedDate: dateKey(24),
  },
);
const reading = bar(
  'reading',
  '读完这本 300 页的小说',
  '📖',
  300,
  '页',
  Array.from({ length: 12 }, (_, i) => [
    -22 + i * 2,
    25,
    i === 11
      ? `最后一页合上了，舍不得这些人。${stickers[2]}`
      : '睡前读一会儿。',
  ]),
  {
    step: 20,
    color: colors[4],
    note: '读完后，想在日记里写下最喜欢的一句话。',
    expectedDate: dateKey(5),
  },
);
const sleep = ring(
  'sleep',
  '把作息慢慢调回来',
  -13,
  30,
  [0, 2, 0, 1, null, 3, 0, 0, 2, 1, 0, null, 0, 0],
  sleepStates,
  20,
);
sleep.events.push({
  id: uid('sleep-note'),
  date: dateKey(-2),
  delta: 0,
  valueAfter: 9,
  note: '出差忘了记具体时间，先留一句：今晚早点休息。',
  createdAt: at(-2, 8),
});
const walking = ring(
  'walk',
  '这周有没有出门走走',
  -3,
  7,
  [0, 1, 0, 0],
  walkStates,
);
const progressGoals = [running, sleep, reading, walking];

function countdown(
  name,
  title,
  target,
  start,
  note,
  rows,
  emoji = stickers[0],
) {
  const notes = rows.map(([offset, text], i) => ({
    id: uid(`${name}-note-${i}`),
    text,
    createdAt: at(offset),
  }));
  return {
    id: uid(name),
    kind: 'countdown',
    title,
    targetDate: dateKey(target),
    emoji,
    note,
    notes,
    color: colors[0],
    createdAt: at(start, 6),
    updatedAt: notes.at(-1)?.createdAt ?? at(start),
  };
}
const countdowns = [
  countdown(
    'live',
    '周末一起看直播',
    3,
    -18,
    '零食和饮料都准备好，留一个不用赶路的晚上。',
    [
      [-14, '把周末的工作提前做完。'],
      [-7, `今天重听了喜欢的歌。${stickers[2]}`],
      [-1, '已经选好要吃的小蛋糕了。'],
    ],
  ),
  countdown(
    'trip',
    '去海边住两天',
    24,
    -8,
    '想看看日出，也想睡一个不用闹钟的懒觉。',
    [
      [-8, '订好住处了。'],
      [-2, '把想去的小店写进了备忘录。'],
    ],
    '🌊',
  ),
];
function keepProgress(goal, end, completedNaturally) {
  const { id, createdAt, updatedAt: _updatedAt, step: _step, ...rest } = goal;
  return {
    ...rest,
    id: uid(`memory-${id}`),
    sourceGoalId: id,
    startedAt: createdAt,
    endedAt: at(end, 9),
    completedNaturally,
  };
}
function keepCountdown(card, end, endedEarly = false) {
  const { id, createdAt, updatedAt: _updatedAt, ...rest } = card;
  return {
    ...rest,
    id: uid(`memory-${id}`),
    sourceCountdownId: id,
    startedAt: createdAt,
    endedAt: at(end, 9),
    endedEarly,
  };
}
const memories = [
  keepProgress(
    ring(
      'old-sleep',
      '第一次认真记录作息',
      -45,
      14,
      [0, 2, 0, 0, 1, 0, null, 0, 0, 2, 0, 0, 0, 0],
      sleepStates,
      10,
    ),
    -31,
    true,
  ),
  keepProgress(
    ring('old-walk', '七天散步手记', -24, 7, [0, 1, 0, 0, 1, 0, 0], walkStates),
    -17,
    true,
  ),
  keepProgress(
    bar(
      'piano',
      '把喜欢的前奏练熟',
      '🎹',
      180,
      '分钟',
      Array.from({ length: 9 }, (_, i) => [
        -60 + i * 3,
        20,
        i === 8 ? '终于能连起来弹了！' : '左手再慢一点。',
      ]),
      { color: colors[7], note: '每天只练一点，不急着弹快。' },
    ),
    -36,
    true,
  ),
  keepProgress(
    bar(
      'summer-run',
      '夏天的 50 公里',
      '🏃',
      50,
      'km',
      Array.from({ length: 10 }, (_, i) => [
        -100 + i * 4,
        5,
        '跑完喝了一大杯水。',
      ]),
      { color: colors[1] },
    ),
    -64,
    true,
  ),
  keepProgress(
    bar(
      'draw',
      '试着画十张小画',
      '🎨',
      10,
      '张',
      [
        [-86, 1, '从窗台的小花开始。'],
        [-80, 1],
        [-72, 1],
        [-65, 1, '最近更想练琴，先把画画放一放。'],
      ],
      { color: colors[3], note: '兴趣可以慢慢试，不一定都要坚持到底。' },
    ),
    -63,
    false,
  ),
  keepCountdown(
    countdown(
      'birthday',
      '给自己过个生日',
      -48,
      -75,
      '这一岁，也请多照顾自己。',
      [
        [-70, '想吃草莓蛋糕。'],
        [-48, `收到家里的电话，还吃到了喜欢的蛋糕。${stickers[0]}`],
      ],
      '🎂',
    ),
    -48,
  ),
  keepCountdown(
    countdown(
      'spring-trip',
      '春天的小旅行',
      -170,
      -200,
      '走了好多路，也看到了好多花。',
      [
        [-190, '订好了车票。'],
        [-170, '天气比预报的还好，拍了一路。'],
      ],
      '🌸',
    ),
    -169,
  ),
  keepCountdown(
    countdown(
      'picnic',
      '原本约好的野餐',
      -90,
      -108,
      '下雨了，改成在家做饭也挺好。',
      [
        [-108, '想带三明治。'],
        [-92, '雨还要下几天，我们决定换个安排。'],
      ],
      '🧺',
    ),
    -92,
    true,
  ),
];

const diaryLines = [
  '下班绕了一点路，看见河面亮闪闪的。回家把饭认真吃完，今天这样就很好。',
  '练琴还是会在同一个地方卡住。把速度降下来之后顺了很多，明天再试。',
  '今天读到了很喜欢的一段，舍不得一下子翻过去。合上书以后又想了一会儿。',
  '和家里打了电话，聊的都是小事。听见熟悉的声音，心里安稳了不少。',
  '忙了一天，晚上只想躺着听歌。没有把清单全部做完，也允许自己休息。',
  '收拾桌子时翻到以前留下的小纸条。原来有些当时很难的事，现在已经过去了。',
  '雨停以后出去走了一圈。鞋子有点湿，不过空气真的很好闻。',
  '周末试着做了新的菜，卖相一般，味道倒是不错。下次少放一点盐。',
  '今天跑得很慢，最后一段干脆走回家。运动完洗个澡，是很踏实的舒服。',
  '看直播笑了好几次，忙碌的一天终于松下来。给明天留一点轻松的心情。',
  '买了一小束花放在桌边。抬头就能看见，工作的时候也没那么闷了。',
  '睡前没有继续刷手机，读了几页书。希望这一点点变化能慢慢留下来。',
];
const recentBodies = new Map([
  [
    -48,
    `给自己过了一个安静的生日。吃到草莓蛋糕，也接到了家里的电话。${stickers[0]}\n新的一岁，还是想慢慢做喜欢的事情。`,
  ],
  [
    -36,
    `喜欢的前奏终于能连起来弹了！九次练习，比一开始想的更有用。🎹\n把这段练琴记录收进纪念册，下一首也慢慢来。`,
  ],
  [
    -3,
    `小说快读完了，有点舍不得这些人。${stickers[2]}\n\n晚上把窗户打开，风里已经有一点秋天的感觉。`,
  ],
  [
    -2,
    `出差回来有点累，作息的时间记不清了，就不硬填。\n今天只想洗个热水澡，早点睡。${stickers[1]}`,
  ],
  [
    -1,
    `河边跑了四公里，最后那一段走回来的。原来多算了热身，已经改好了。🏃\n\n给家里打了电话，聊到晚饭吃什么。都是小事，但很想把今天留下来。${stickers[2]}`,
  ],
  [
    0,
    `今天早睡早起了，慢慢调整好像真的有用。${stickers[0]}\n\n读完小说最后二十五页，像和老朋友道了别。又练了一会儿琴，手指终于没那么打架了。晚上想给自己买束花，等回家再接着写。`,
  ],
]);
const photos = [];
function photo(offset, variant = 0) {
  const id = uid(`photo-${offset}-${variant}`);
  const caption = variant ? '桌边的小花' : '散步时的晚霞';
  const drawing = variant
    ? '<path d="M400 820 Q360 590 440 410 M450 820 Q510 590 570 470" stroke="#6F9A76" stroke-width="16" fill="none"/><circle cx="440" cy="410" r="80" fill="#E799B0"/><circle cx="570" cy="470" r="65" fill="#D8946B"/><path d="M320 650 H570 L530 900 H360Z" fill="#fffaf7"/>'
    : '<circle cx="660" cy="430" r="110" fill="#ffe8ab"/><path d="M0 600 Q200 480 480 640 T900 560 V1200 H0Z" fill="#8B78A8"/><path d="M0 800 Q300 650 570 850 T900 770 V1200 H0Z" fill="#5B9292"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#f5ddd8"/>${drawing}<rect x="70" y="990" width="760" height="130" rx="24" fill="#fffaf7" opacity=".9"/><text x="450" y="1045" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#514852">${caption} · 示例插画</text><text x="450" y="1090" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#84787E">${dateKey(offset)}</text></svg>`;
  photos.push({
    id,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    name: `${dateKey(offset)}-${caption}.svg`,
    createdAt: at(offset, 7),
  });
  return id;
}
const allProgress = [
  ...progressGoals,
  ...memories.filter((m) => m.kind === 'progress'),
];
const diaries = Array.from({ length: 730 }, (_, i) => {
  const offset = i - 729;
  const taskSnapshots =
    offset >= -1
      ? dailyTasks
          .filter((task) => task.date === dateKey(offset) && task.done)
          .slice(0, 2)
          .map((task) => ({
            id: uid(`snapshot-${task.id}`),
            sourceTaskId: task.id,
            emoji: task.emoji,
            title: task.title,
            done: task.done,
          }))
      : i % 3 === 0
        ? [
            {
              id: uid(`snapshot-${i}`),
              sourceTaskId: uid(`past-task-${i}`),
              emoji: commonItems[i % 7].emoji,
              title: commonItems[i % 7].title,
              done: i % 9 !== 0,
            },
          ]
        : [];
  // Only a few moments were deliberately collected, not every growth event.
  const growthSnapshots = allProgress.flatMap((goal) => {
    if (offset !== 0 && offset !== -1 && i % 4 !== 0) return [];
    const events = goal.events.filter(
      (event) => event.date === dateKey(offset),
    );
    const event = events.at(-1);
    if (!event || (goal.challenge && !event.outcome)) return [];
    const status = goal.challenge?.states.find(
      (state) => state.id === event.outcome,
    );
    return [
      {
        id: uid(`growth-snapshot-${goal.id}-${i}`),
        kind: 'progress',
        sourceId: goal.sourceGoalId ?? goal.id,
        emoji: status?.emoji ?? goal.emoji,
        title: goal.title,
        delta: events.reduce((sum, e) => sum + e.delta, 0),
        ...(status ? { challengeResult: status.name } : {}),
        current: event.valueAfter,
        total: goal.total,
        unit: goal.unit,
        note: event.note ?? '',
        capturedAt: at(offset, 9),
      },
    ];
  });
  if (offset === -1)
    growthSnapshots.push({
      id: uid('live-snapshot'),
      kind: 'countdown',
      sourceId: countdowns[0].id,
      emoji: countdowns[0].emoji,
      title: countdowns[0].title,
      remainingDays: 4,
      note: '已经选好要吃的小蛋糕了。',
      capturedAt: at(-1, 9),
    });
  const photoIds = i % 47 === 0 || offset === -1 ? [photo(offset)] : [];
  if (offset === -1) photoIds.push(photo(offset, 1));
  return {
    date: dateKey(offset),
    mood: ['good', 'plain', 'happy', '', 'annoyed', 'sad', 'good'][i % 7],
    body:
      recentBodies.get(offset) ??
      `${diaryLines[(i * 7 + Math.floor(i / 12)) % diaryLines.length]}${i % 5 === 0 ? `\n\n${stickers[i % 3]}` : ''}`,
    photoIds,
    taskSnapshots,
    growthSnapshots,
    createdAt: at(offset, 9),
    updatedAt: at(offset, 9, 10),
  };
});
const dateMarkers = Array.from({ length: 730 }, (_, i) => i - 729)
  .filter((offset) => offset % 19 === 0 || [-48, -3, -1].includes(offset))
  .map((offset, i) => ({
    date: dateKey(offset),
    color: colors[i % colors.length],
  }));
const state = normalizeState({
  version: 4,
  commonItems,
  dailyTasks,
  countdowns,
  progressGoals,
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
    journalLines: false,
  },
});
// Check actual totals, chronology, and photo references before writing an importable backup.
for (const goal of [
  ...state.progressGoals,
  ...state.memories.filter((m) => m.kind === 'progress'),
]) {
  let value = 0;
  for (const event of [...goal.events].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    value = Math.round((value + event.delta) * 100) / 100;
    assert.equal(
      event.valueAfter,
      value,
      `${goal.title}: inconsistent event total`,
    );
    assert(event.createdAt >= (goal.createdAt ?? goal.startedAt));
    assert(event.createdAt <= (goal.updatedAt ?? goal.endedAt));
    assert(event.date <= dateKey(0));
  }
  assert.equal(
    goal.current,
    value,
    `${goal.title}: inconsistent current total`,
  );
}
const photoIds = new Set(photos.map((p) => p.id));
for (const entry of state.diaries)
  for (const id of entry.photoIds) assert(photoIds.has(id));
assert.deepEqual(
  normalizeState(state),
  state,
  'Import normalization should preserve the generated state',
);
const backup = {
  product: 'asoul-diary-v3',
  exportedAt: new Date().toISOString(),
  state,
  photos,
};
const directory = join(root, 'fixtures');
await mkdir(directory, { recursive: true });
const output = join(directory, 'two-years-sample-backup.json');
await writeFile(output, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
console.log(`Generated ${output}`);
console.log(
  `${diaries.length} diaries, ${dailyTasks.length} tasks, ${progressGoals.length} progress cards, ${countdowns.length} countdowns, ${memories.length} memories, ${dateMarkers.length} markers, ${photos.length} illustrations`,
);
