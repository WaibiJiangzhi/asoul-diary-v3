import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: ['lib/journal-snapshots.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { taskSnapshot, growthSnapshot, refreshDiarySnapshots } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);
const date = '2026-09-10';
const time = '2026-09-10T09:00:00+08:00';
const task = {
  id: 'task',
  date,
  title: '读书',
  emoji: '📖',
  done: false,
  createdAt: time,
  updatedAt: time,
};
const goal = {
  id: 'goal',
  kind: 'progress',
  title: '阅读',
  emoji: '📚',
  current: 12,
  total: 20,
  unit: '页',
  events: [
    {
      id: 'read',
      delta: 12,
      valueAfter: 12,
      date,
      createdAt: time,
      note: '今天读得很开心',
    },
  ],
};

await test('copies remain fixed until explicit confirmation refreshes the selected sources', () => {
  const entry = {
    date,
    taskSnapshots: [taskSnapshot(task)],
    growthSnapshots: [growthSnapshot(goal, date)],
  };
  const original = structuredClone(entry);
  const changedTask = { ...task, title: '换一本书', emoji: '🌱', done: true };
  const changedGoal = {
    ...goal,
    title: '新书',
    current: 15,
    events: [
      ...goal.events,
      { id: 'more', delta: 3, valueAfter: 15, date, createdAt: time },
    ],
  };
  assert.deepEqual(entry, original);
  const refreshed = refreshDiarySnapshots(entry, [changedTask], [changedGoal]);
  assert.equal(refreshed.taskSnapshots[0].title, '换一本书');
  assert.equal(refreshed.taskSnapshots[0].done, true);
  assert.equal(refreshed.growthSnapshots[0].current, 15);
  assert.equal(refreshed.growthSnapshots[0].delta, 15);
  assert.deepEqual(entry, original);
});

await test('deleted sources stay in the diary; unselected sources are not added on confirmation', () => {
  const entry = {
    date,
    taskSnapshots: [taskSnapshot(task)],
    growthSnapshots: [growthSnapshot(goal, date)],
  };
  const refreshed = refreshDiarySnapshots(
    entry,
    [{ ...task, id: 'different' }],
    [{ ...goal, id: 'different' }],
  );
  assert.deepEqual(refreshed.taskSnapshots, entry.taskSnapshots);
  assert.deepEqual(refreshed.growthSnapshots, entry.growthSnapshots);
  assert.deepEqual(
    refreshDiarySnapshots(
      { date, taskSnapshots: [], growthSnapshots: [] },
      [task],
      [goal],
    ),
    { taskSnapshots: [], growthSnapshots: [] },
  );
});

await test('a restored or archived growth source refreshes its original copy without duplicating it', () => {
  const entry = {
    date,
    taskSnapshots: [],
    growthSnapshots: [growthSnapshot(goal, date)],
  };
  const memory = {
    ...goal,
    id: 'memory',
    sourceGoalId: goal.id,
    title: '完成后的书',
  };
  const result = refreshDiarySnapshots(entry, [], [memory]);
  assert.equal(result.growthSnapshots.length, 1);
  assert.equal(result.growthSnapshots[0].sourceId, goal.id);
  assert.equal(result.growthSnapshots[0].id, entry.growthSnapshots[0].id);
  assert.equal(result.growthSnapshots[0].title, memory.title);
});

await test('ring and countdown copies refresh only the chosen day, with text and decoration', () => {
  const ring = {
    ...goal,
    total: 7,
    unit: '天',
    challenge: {
      startDate: '2026-09-09',
      states: [
        { id: 'early', name: '早睡早起', emoji: '🌞', color: '#E799B0' },
        { id: 'late', name: '晚睡晚起', emoji: '🌙', color: '#576690' },
      ],
    },
    events: [
      {
        id: 'previous',
        date: '2026-09-09',
        outcome: 'early',
        delta: 1,
        valueAfter: 1,
        createdAt: time,
      },
      {
        id: 'today',
        date,
        outcome: 'late',
        delta: 1,
        valueAfter: 2,
        note: '晚睡了',
        createdAt: time,
      },
    ],
  };
  const snapshot = growthSnapshot(ring, date);
  assert.equal(snapshot.challengeResult, '晚睡晚起');
  assert.equal(snapshot.emoji, '🌙');
  assert.equal(snapshot.current, 2);
  assert.equal(snapshot.note, '晚睡了');
  const countdown = {
    id: 'date',
    kind: 'countdown',
    title: '周末',
    emoji: '🌱',
    targetDate: '2026-09-12',
    notes: [
      { id: 'today', text: '期待见面', createdAt: time },
      {
        id: 'later',
        text: '后一天的话',
        createdAt: '2026-09-11T09:00:00+08:00',
      },
    ],
  };
  assert.equal(growthSnapshot(countdown, date).remainingDays, 2);
  assert.equal(growthSnapshot(countdown, date).note, '期待见面');
});
