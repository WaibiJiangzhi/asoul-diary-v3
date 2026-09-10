import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Bundle the pure rules to exercise the same TypeScript used by the app.
async function loadModule(path) {
  const { outputFiles } = await build({
    entryPoints: [fileURLToPath(new URL(path, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
  );
}
const {
  recordChallengeDay,
  clearChallengeDay,
  challengeStats,
  canRecordChallenge,
  rebuildChallenge,
  challengeEnd,
  progressEventLabel,
  DEFAULT_RECORD_STATES,
  challengeSegments,
} = await loadModule('../lib/challenge.ts');
const { normalizeState, createDefaultState } =
  await loadModule('../lib/defaults.ts');
const {
  adjustProgressEntry,
  progressEventDate,
  progressRecordDate,
  progressValueOnDate,
} = await loadModule('../lib/progress.ts');
const initial = {
  id: 'goal',
  kind: 'progress',
  title: '早睡早起',
  emoji: '',
  color: '#E799B0',
  current: 0,
  total: 5,
  unit: '天',
  step: 1,
  note: '00:30 前睡，09:00 前起',
  events: [],
  challenge: {
    startDate: '2026-09-08',
    states: DEFAULT_RECORD_STATES,
    targetStateId: 'done',
    targetCelebrated: false,
    targetDays: 3,
  },
  createdAt: '2026-09-08T00:00:00Z',
  updatedAt: '2026-09-08T00:00:00Z',
};
const record = (goal, date, outcome, id = date, note = '') =>
  recordChallengeDay(
    goal,
    date,
    outcome,
    note,
    id,
    '2026-09-10T04:00:00Z',
    '2026-09-10',
  );

await test('four states retain calendar order; overview groups the expectation first and distinguishes future', () => {
  const states = [
    ...DEFAULT_RECORD_STATES,
    { id: 'rest', name: '休息', color: '#5B9292', emoji: '😴' },
    { id: 'other', name: '其他', color: '#C89B4B', emoji: '' },
  ];
  let goal = {
    ...initial,
    challenge: {
      ...initial.challenge,
      startDate: '2026-09-06',
      states,
      targetStateId: 'rest',
    },
    total: 8,
  };
  goal = record(goal, '2026-09-06', 'other');
  goal = record(goal, '2026-09-07', 'done');
  goal = record(goal, '2026-09-08', 'rest');
  goal = record(goal, '2026-09-10', 'done');
  assert.deepEqual(challengeSegments(goal, 'date', '2026-09-10'), [
    { stateId: 'other', days: 1 },
    { stateId: 'done', days: 1 },
    { stateId: 'rest', days: 1 },
    { stateId: 'unrecorded', days: 1 },
    { stateId: 'done', days: 1 },
    { stateId: 'future', days: 3 },
  ]);
  assert.deepEqual(challengeSegments(goal, 'overview', '2026-09-10'), [
    { stateId: 'rest', days: 1 },
    { stateId: 'done', days: 2 },
    { stateId: 'other', days: 1 },
    { stateId: 'unrecorded', days: 1 },
    { stateId: 'future', days: 3 },
  ]);
  assert.equal(record(goal, '2026-09-09', 'unknown'), goal);
  assert.equal(progressEventLabel(goal, goal.events[0]), '其他');
});

await test('a full single-color ring is one segment and only the first expectation crossing celebrates', () => {
  let goal = { ...initial, total: 3 };
  goal = record(goal, '2026-09-08', 'done');
  goal = record(goal, '2026-09-09', 'done');
  assert.equal(goal.challenge.targetCelebrated, false);
  goal = record(goal, '2026-09-10', 'done');
  assert.equal(goal.challenge.targetCelebrated, true);
  for (const view of ['date', 'overview'])
    assert.deepEqual(challengeSegments(goal, view, '2026-09-10'), [
      { stateId: 'done', days: 3 },
    ]);
  const edited = record(goal, '2026-09-10', 'missed');
  assert.equal(edited.challenge.targetCelebrated, true);
  assert.equal(
    record(edited, '2026-09-10', 'done').challenge.targetCelebrated,
    true,
  );
  assert.equal(edited.current, 3);
});

await test('either outcome fills one day; replacing a day never adds another', () => {
  let goal = record(initial, '2026-09-08', 'done');
  goal = record(goal, '2026-09-09', 'missed');
  assert.deepEqual(challengeStats(goal), {
    recorded: 2,
    counts: { done: 1, missed: 1 },
    targetCount: 1,
    remaining: 3,
  });
  goal = record(goal, '2026-09-09', 'done', 'replacement', '补充');
  assert.equal(goal.events.length, 2);
  assert.equal(goal.events[1].id, '2026-09-09');
  assert.equal(goal.current, 2);
  assert.equal(challengeStats(goal).counts.done, 2);
});

await test('inclusive calendar period, leap dates, past backfill and future guards', () => {
  assert.equal(challengeEnd(initial), '2026-09-12');
  for (const day of [
    '2026-09-07',
    '2026-09-11',
    '2026-09-13',
    '2026-02-30',
    '',
  ]) {
    assert.equal(canRecordChallenge(initial, day, '2026-09-10'), false);
    assert.equal(record(initial, day, 'done'), initial);
  }
  assert.equal(canRecordChallenge(initial, '2026-09-12', '2026-10-01'), true);
  assert.equal(
    challengeEnd({
      ...initial,
      total: 3,
      challenge: { ...initial.challenge, startDate: '2028-02-28' },
    }),
    '2028-03-01',
  );
});

await test('backfill order and deleting a result leave other days and notes intact', () => {
  let goal = record(
    record(initial, '2026-09-10', 'missed'),
    '2026-09-08',
    'done',
  );
  assert.equal(
    goal.events.find((event) => event.date === '2026-09-08').valueAfter,
    1,
  );
  goal = rebuildChallenge({
    ...goal,
    events: [
      ...goal.events,
      {
        id: 'note',
        delta: 0,
        valueAfter: 2,
        note: '调整作息',
        createdAt: '2026-09-10T04:00:00Z',
      },
    ],
  });
  assert.equal(goal.current, 2);
  assert.equal(progressEventLabel(goal, goal.events.at(-1)), '文字足迹');
  goal = rebuildChallenge({
    ...goal,
    events: goal.events.filter((event) => event.date !== '2026-09-08'),
  });
  assert.equal(goal.current, 1);
  assert.equal(goal.events.length, 2);
  assert.equal(challengeStats(goal).counts.missed, 1);
});

await test('editing a past result keeps the original agreement', () => {
  const goal = record(initial, '2026-09-08', 'done');
  const changed = record(
    { ...goal, note: '01:00 前睡' },
    '2026-09-08',
    'missed',
  );
  assert.equal(changed.events[0].rule, initial.note);
});

await test('JSON backup normalization preserves challenge facts and optional targets', () => {
  const goal = record(initial, '2026-09-09', 'missed');
  const memory = {
    ...goal,
    sourceGoalId: goal.id,
    startedAt: goal.createdAt,
    endedAt: goal.updatedAt,
    completedNaturally: false,
  };
  const state = {
    ...createDefaultState(),
    progressGoals: [goal],
    memories: [memory],
  };
  const restored = normalizeState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.progressGoals[0], goal);
  assert.deepEqual(restored.memories[0].challenge, initial.challenge);
  assert.equal(challengeStats(restored.memories[0]).counts.missed, 1);
  assert.equal(
    normalizeState({
      ...state,
      progressGoals: [
        { ...goal, challenge: { ...goal.challenge, targetDays: 99 } },
      ],
    }).progressGoals[0].challenge.targetDays,
    undefined,
  );
});

await test('old progress cards keep their fractional counts and negative adjustments', () => {
  const legacy = {
    ...initial,
    challenge: undefined,
    current: 2.5,
    total: 10.5,
    events: [
      { id: 'old', delta: -0.5, valueAfter: 2.5, createdAt: initial.createdAt },
    ],
  };
  const loaded = normalizeState({
    ...createDefaultState(),
    progressGoals: [legacy],
  }).progressGoals[0];
  assert.equal(loaded.current, 2.5);
  assert.equal(loaded.total, 10.5);
  assert.equal(loaded.events[0].delta, -0.5);
  assert.equal(loaded.challenge, undefined);
});

await test('cumulative backfill adds several entries per day, with no deadline cutoff', () => {
  let goal = {
    ...initial,
    challenge: undefined,
    total: 10,
    unit: '张',
    expectedDate: '2026-09-01',
  };
  const add = (delta, date, note = '') => {
    goal = adjustProgressEntry(
      goal,
      delta,
      note,
      date,
      `entry-${goal.events.length}`,
      '2026-09-10T04:00:00Z',
      '2026-09-10',
    );
  };
  add(2, '2026-09-10');
  add(1, '2026-09-09');
  add(3, '2026-09-09');
  add(0, '2026-09-09', '补记昨天的画');
  assert.equal(goal.current, 6);
  assert.equal(progressValueOnDate(goal, '2026-09-09'), 4);
  assert.equal(progressValueOnDate(goal, '2026-09-10'), 6);
  assert.equal(
    goal.events.filter((e) => progressEventDate(e) === '2026-09-09').length,
    3,
  );
  assert.equal(
    goal.events
      .filter((e) => progressEventDate(e) === '2026-09-09')
      .reduce((sum, e) => sum + e.delta, 0),
    4,
  );
  add(5, '2026-09-11');
  add(5, '2026-02-30');
  assert.equal(goal.current, 6);
  add(-99, '2026-09-09');
  assert.equal(goal.current, 0);
  assert.equal(goal.events.at(-1).delta, -6);
  const memory = {
    ...goal,
    sourceGoalId: goal.id,
    startedAt: goal.createdAt,
    endedAt: goal.updatedAt,
    completedNaturally: false,
  };
  const loaded = normalizeState(
    JSON.parse(
      JSON.stringify({
        ...createDefaultState(),
        progressGoals: [goal],
        memories: [memory],
      }),
    ),
  );
  assert.deepEqual(loaded.progressGoals[0].events, goal.events);
  assert.equal(loaded.progressGoals[0].expectedDate, '2026-09-01');
  assert.equal(loaded.memories[0].expectedDate, '2026-09-01');
});

await test('daily text follows the selected day without recording an outcome', () => {
  const goal = record(initial, '2026-09-10', 'done');
  const withNote = adjustProgressEntry(
    goal,
    0,
    '昨天很忙',
    '2026-09-09',
    'note',
    '2026-09-10T04:00:00Z',
    '2026-09-10',
  );
  const normalized = rebuildChallenge(withNote);
  assert.equal(normalized.current, 1);
  assert.equal(progressEventDate(normalized.events.at(-1)), '2026-09-09');
  assert.equal(normalized.events.at(-1).valueAfter, 0);
  assert.equal(
    adjustProgressEntry(
      goal,
      1,
      '',
      '2026-09-09',
      'bad',
      goal.updatedAt,
      '2026-09-10',
    ),
    goal,
  );
  assert.equal(
    adjustProgressEntry(
      goal,
      0,
      '不在范围内',
      '2026-09-07',
      'bad',
      goal.updatedAt,
      '2026-09-10',
    ),
    goal,
  );
});

await test('calendar selection stays in range after challenge edits and legacy dates survive', () => {
  assert.equal(
    progressRecordDate(initial, '2026-09-01', '2026-09-10'),
    '2026-09-10',
  );
  assert.equal(progressRecordDate(initial, '', '2026-09-20'), '2026-09-12');
  assert.equal(progressRecordDate(initial, '', '2026-09-01'), '2026-09-08');
  assert.equal(
    progressEventDate({ createdAt: new Date(2026, 8, 7, 12).toISOString() }),
    '2026-09-07',
  );
});

await test('clearing a state keeps its text and other days, and future clears are ignored', () => {
  let goal = record(initial, '2026-09-08', 'done', 'first', '很开心');
  goal = record(goal, '2026-09-09', 'missed');
  const cleared = clearChallengeDay(
    goal,
    '2026-09-08',
    '2026-09-10T06:00:00Z',
    '2026-09-10',
  );
  assert.equal(cleared.current, 1);
  assert.equal(cleared.events.find((e) => e.id === 'first').note, '很开心');
  assert.equal(cleared.events.find((e) => e.id === 'first').outcome, undefined);
  assert.equal(cleared.events.find((e) => e.id === 'first').delta, 0);
  assert.deepEqual(challengeStats(cleared).counts, { done: 0, missed: 1 });
  assert.equal(
    clearChallengeDay(cleared, '2026-09-08', goal.updatedAt, '2026-09-10'),
    cleared,
  );
  assert.equal(
    clearChallengeDay(goal, '2026-09-09', goal.updatedAt, '2026-09-08'),
    goal,
  );
  const again = record(cleared, '2026-09-08', 'missed', 'second');
  assert.equal(again.current, 2);
  assert.equal(again.events.filter((e) => e.note === '很开心').length, 1);
  assert.equal(
    clearChallengeDay(goal, '2026-09-09', goal.updatedAt, '2026-09-10').events
      .length,
    1,
  );
});

await test('expired today tasks are pruned without changing independent diary snapshots', async () => {
  const { prepareLoadedState } = await loadModule('../lib/state.ts');
  const state = createDefaultState();
  state.dailyTasks = [
    '2026-09-08',
    '2026-09-09',
    '2026-09-10',
    '2026-09-11',
  ].map((date, i) => ({
    id: String(i),
    date,
    title: '小事',
    emoji: '🌱',
    done: true,
  }));
  state.diaries = [
    {
      date: '2026-09-08',
      body: '想留下的话',
      taskSnapshots: [
        {
          id: 'saved',
          sourceTaskId: '0',
          title: '小事',
          done: true,
          emoji: '🌱',
        },
      ],
      growthSnapshots: [],
      photoIds: [],
    },
  ];
  const next = prepareLoadedState(state, '2026-09-10');
  assert.deepEqual(
    next.dailyTasks.map((task) => task.date),
    ['2026-09-09', '2026-09-10', '2026-09-11'],
  );
  assert.equal(next.diaries, state.diaries);
  assert.equal(next.diaries[0].taskSnapshots[0].done, true);
});
