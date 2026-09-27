import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
const { outputFiles } = await build({
  stdin: {
    contents:
      "export * from './lib/life'; export * from './lib/defaults'; export * from './lib/backup-validation'; export * from './lib/card-templates'; export * from './lib/card-edit'; export * from './lib/backup-reminder'; export * from './lib/demo-photos';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const lib = await import(
  'data:text/javascript;base64,' +
    Buffer.from(outputFiles[0].text).toString('base64')
);
const {
  createLifeCard,
  createDefaultState,
  createDemoState,
  validateState,
  validateBackup,
  saveLifeRecord,
  progressValue,
  completed,
  cycleFilled,
  reachedMilestone,
  stageComplete,
  statusRecord,
  canRecord,
  elapsedDays,
  recentDays,
  CARD_TEMPLATES,
  createCardFromTemplate,
  restartLifeCard,
  getCommonCards,
  stageEmoji,
} = lib;
const today = '2026-09-27';
const card = (kind) => ({
  ...createLifeCard(kind),
  title: '测试卡片',
  startDate: '2026-09-01',
});
let sequence = 0;
const entry = (extra = {}) => ({
  id: 'record-' + ++sequence,
  date: today,
  body: '',
  photoIds: [],
  createdAt: new Date(Date.UTC(2026, 8, 27, 0, 0, sequence)).toISOString(),
  updatedAt: new Date().toISOString(),
  ...extra,
});
const save = (c, r) => saveLifeRecord(c, r, today);
await test('common cards are independent of living cards and an empty saved list stays empty', () => {
  const state = createDefaultState();
  const common = getCommonCards(state);
  assert.equal(common.length, 4);
  const living = restartLifeCard(common[0]);
  const next = { ...state, commonCards: common, cards: [living] };
  validateState(next);
  next.commonCards[0].title = '改过的常用卡片';
  next.commonCards[0].record.states[0].name = '新的名称';
  assert.notEqual(living.title, next.commonCards[0].title);
  assert.notEqual(
    living.record.states[0].name,
    next.commonCards[0].record.states[0].name,
  );
  assert.deepEqual(getCommonCards({ commonCards: [] }), []);
  assert.throws(() =>
    validateState({
      ...next,
      commonCards: [{ ...common[0], records: [entry()] }],
    }),
  );
});
await test('stage stickers follow the latest completion, clear on undo, and survive backup validation', () => {
  let c = card('stage');
  const id = c.stages[0].id;
  c = save(c, entry({ stageId: id, stageDone: true, stageEmoji: '🎉' }));
  assert.equal(stageEmoji(c, id), '🎉');
  validateState({ ...createDefaultState(), cards: [c] });
  c = save(c, entry({ stageId: id, stageDone: false, stageEmoji: '🎉' }));
  assert.equal(stageEmoji(c, id), '');
  const before = c;
  c = save(c, entry({ stageId: id, stageDone: true, stageEmoji: '🥰' }));
  assert.equal(stageEmoji(c, id), '🥰');
  assert.ok(reachedMilestone(before, c));
});
await test('each template can be saved immediately; copies have independent identity and configuration', () => {
  const copies = CARD_TEMPLATES.flatMap((t) => [
    createCardFromTemplate(t.id),
    createCardFromTemplate(t.id),
  ]);
  validateState({ ...createDefaultState(), cards: copies });
  assert.equal(new Set(copies.map((c) => c.id)).size, copies.length);
  assert.equal(new Set(copies.map((c) => c.kind)).size, 4);
  const sleep = createCardFromTemplate('sleep');
  sleep.record.states[0].name = '自己改的状态';
  assert.equal(
    createCardFromTemplate('sleep').record.states[0].name,
    '早睡早起',
  );
});
await test('reusing a card clears outcomes, dates, progress and photo references without changing the original', () => {
  const source = card('progress');
  source.location = 'memory';
  source.archivedAt = '2026-09-20T00:00:00.000Z';
  source.ending = 'achieved';
  source.summary = '一段旧经历';
  source.progress = {
    initial: 8,
    total: 10,
    unit: 'km',
    step: 2,
    expectedDate: '2026-09-20',
  };
  source.records = [entry({ delta: 2, photoIds: ['keep-original-photo'] })];
  source.record = createCardFromTemplate('sleep').record;
  source.stages = [{ id: 'one', title: '第一步' }];
  const before = structuredClone(source);
  const fresh = restartLifeCard(source);
  validateState({ ...createDefaultState(), cards: [fresh] });
  assert.notEqual(fresh.id, source.id);
  assert.equal(fresh.startDate, createLifeCard().startDate);
  assert.equal(fresh.location, 'active');
  assert.deepEqual(fresh.records, []);
  assert.equal(progressValue(fresh), 0);
  assert.equal(completed(fresh), false);
  assert.equal(fresh.progress.total, 10);
  assert.equal(fresh.progress.expectedDate, undefined);
  assert.equal(fresh.archivedAt, undefined);
  assert.equal(fresh.ending, undefined);
  assert.equal(fresh.summary, undefined);
  fresh.record.states[0].name = '新状态';
  fresh.stages[0].title = '新的一步';
  fresh.progress.total = 20;
  assert.deepEqual(source, before);
});
await test('progress can exceed the target, negative adjustments clamp, and editing replaces rather than doubles', () => {
  let c = card('progress');
  c.progress = { initial: 0, total: 10, unit: 'km', step: 1 };
  c = save(c, entry({ delta: 12 }));
  c = save(c, entry({ delta: 1 }));
  assert.equal(progressValue(c), 13);
  const first = c.records[0];
  c = save(c, { ...first, delta: 8 });
  assert.equal(progressValue(c), 9);
  c = save(c, entry({ delta: -100 }));
  assert.equal(progressValue(c), 0);
  assert.equal(c.records.at(-1).delta, -9);
  assert.throws(() => save(c, entry({ delta: NaN })));
  assert.throws(() => save(c, entry({ date: '2026-09-28', delta: 1 })));
});
await test('undo and re-completion produce a fresh milestone every time, extra progress does not', () => {
  const start = card('progress');
  start.progress.total = 2;
  const one = save(start, entry({ delta: 1 }));
  const two = save(one, entry({ delta: 1 }));
  assert.equal(reachedMilestone(one, two), true);
  assert.equal(completed(two), true);
  const down = save(two, entry({ delta: -1 }));
  assert.equal(completed(down), false);
  assert.equal(reachedMilestone(two, down), false);
  const again = save(down, entry({ delta: 1 }));
  assert.equal(reachedMilestone(down, again), true);
  assert.equal(
    reachedMilestone(again, save(again, entry({ delta: 1 }))),
    false,
  );
});
await test('daily state is unique while unrelated text and photos stay intact', () => {
  let c = card('record');
  const original = entry({
    statusId: 'done',
    body: '不想弄丢的话',
    photoIds: ['photo-one'],
  });
  c = save(c, original);
  c = save(c, entry({ statusId: 'rest' }));
  assert.equal(c.records.length, 2);
  assert.equal(statusRecord(c, today).statusId, 'rest');
  assert.equal(c.records[0].body, original.body);
  assert.deepEqual(c.records[0].photoIds, ['photo-one']);
  assert.equal(c.records[0].statusId, undefined);
  const selected = statusRecord(c, today);
  c = save(c, { ...selected, statusId: undefined });
  assert.equal(statusRecord(c, today), undefined);
  assert.equal(c.records.length, 1);
});
await test('fully recording a cycle celebrates even when its target state was not achieved', () => {
  let c = card('record');
  c.startDate = '2026-09-25';
  c.record = {
    ...c.record,
    periodDays: 3,
    targetDays: 3,
    targetStateId: 'done',
  };
  for (const date of ['2026-09-25', '2026-09-26'])
    c = save(c, entry({ date, statusId: 'rest' }));
  const full = save(c, entry({ statusId: 'rest' }));
  assert.equal(completed(full), false);
  assert.equal(cycleFilled(full), true);
  assert.equal(reachedMilestone(c, full), true);
  const undo = { ...full, records: full.records.slice(0, -1) };
  assert.equal(cycleFilled(undo), false);
  assert.equal(
    reachedMilestone(undo, save(undo, entry({ statusId: 'rest' }))),
    true,
  );
  assert.equal(canRecord(full, '2026-09-28', '2026-09-30'), true);
});
await test('stage backfills follow recorded dates, with independent milestones and reversible completion', () => {
  let c = card('stage');
  c.stages = [
    { id: 'a', title: '开始' },
    { id: 'b', title: '做到' },
  ];
  c = save(c, entry({ date: '2026-09-20', stageId: 'a', stageDone: true }));
  c = save(c, entry({ date: '2026-09-15', stageId: 'a', stageDone: false }));
  assert.equal(stageComplete(c, 'a'), true);
  const full = save(c, entry({ stageId: 'b', stageDone: true }));
  assert.equal(reachedMilestone(c, full), true);
  const undo = save(full, entry({ stageId: 'b', stageDone: false }));
  assert.equal(completed(undo), false);
  assert.equal(
    reachedMilestone(
      undo,
      save(undo, entry({ stageId: 'b', stageDone: true })),
    ),
    true,
  );
});
await test('changing card presentation preserves all records and original configurations', () => {
  const before = save(
    card('record'),
    entry({ statusId: 'done', body: '第一天', photoIds: ['photo-one'] }),
  );
  const after = {
    ...before,
    kind: 'progress',
    progress: { initial: 0, unit: '小时', step: 1 },
  };
  const state = { ...createDefaultState(), cards: [after] };
  validateState(state);
  assert.deepEqual(after.records, before.records);
  assert.equal(lib.recordLabel(after, after.records[0]), '做到了');
  const archived = {
    ...after,
    location: 'memory',
    ending: 'closed',
    archivedAt: new Date().toISOString(),
  };
  assert.equal(canRecord(archived, today, today), false);
  assert.equal(
    canRecord({ ...archived, location: 'active' }, today, today),
    true,
  );
});
await test('new backup schema rejects broken references, duplicate daily states, old formats and malformed dates', () => {
  const c = card('record');
  c.records = [entry({ statusId: 'done' })];
  const state = { ...createDefaultState(), cards: [c] };
  validateState(state);
  const candidates = [
    { ...state, version: 3 },
    { ...state, cards: [{ ...c, startDate: '2026-02-30' }] },
    { ...state, cards: [{ ...c, records: [entry({ statusId: 'unknown' })] }] },
    {
      ...state,
      cards: [
        {
          ...c,
          records: [entry({ statusId: 'done' }), entry({ statusId: 'rest' })],
        },
      ],
    },
    {
      ...state,
      cards: [{ ...c, records: [entry({ photoIds: ['same', 'same'] })] }],
    },
    { ...state, cards: [c, c] },
  ];
  candidates.forEach((value) => assert.throws(() => validateState(value)));
  assert.throws(() =>
    validateBackup({ product: 'old', exportedAt: '', state, photos: [] }),
  );
  validateBackup({
    product: 'asoul-life-v3',
    exportedAt: new Date().toISOString(),
    state,
    photos: [],
  });
});
await test('seven-day strip crosses month/year boundaries; example covers all four kinds, later, memories and companion types', () => {
  assert.deepEqual(recentDays('2026-01-03'), [
    '2025-12-28',
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
  ]);
  assert.equal(elapsedDays('2026-03-07', '2026-03-09'), 3);
  const demo = createDemoState();
  validateState(demo);
  assert.equal(new Set(demo.cards.map((c) => c.kind)).size, 4);
  assert.equal(new Set(demo.cards.map((c) => c.location)).size, 3);
  assert.equal(new Set(demo.companions.map((c) => c.kind)).size, 2);
});

await test('deadlines respect card type and countdown priority uses today before tomorrow', () => {
  const c = createLifeCard('record');
  c.startDate = '2026-12-30';
  c.record.periodDays = 4;
  assert.equal(lib.cardDeadline(c), '2027-01-02');
  assert.equal(lib.deadlineDistance('2027-01-01', '2026-12-31'), 1);
  const stage = createLifeCard('stage');
  stage.expectedDate = '2026-10-10';
  assert.equal(lib.cardDeadline(stage), '2026-10-10');
  assert.equal(lib.restartLifeCard(stage).expectedDate, undefined);
  const cards = [
    { kind: 'quote' },
    { kind: 'countdown', targetDate: '2026-10-11' },
    { kind: 'countdown', targetDate: '2026-10-10' },
    { kind: 'countdown', targetDate: '2026-10-10' },
  ];
  assert.deepEqual(lib.priorityCompanions(cards, '2026-10-10'), cards.slice(2));
  assert.deepEqual(lib.priorityCompanions(cards, '2026-10-09'), cards.slice(2));
  assert.deepEqual(lib.priorityCompanions(cards, '2026-10-01'), cards);
  const state = createDefaultState();
  stage.title = '测试日期';
  state.cards = [stage];
  validateState(state);
  stage.expectedDate = '2026-13-42';
  assert.throws(() => validateState(state));
});

await test('editing after a recording deadline preserves later entries and uses the latest records', () => {
  const original = card('record');
  original.record.periodDays = 3;
  const draft = structuredClone(original);
  const updated = save(original, entry({ statusId: 'done' }));
  const state = { ...createDefaultState(), cards: [updated] };
  const next = lib.saveCardDraft(state, { ...draft, title: ' 新的标题 ' });
  assert.equal(next.cards[0].title, '新的标题');
  assert.deepEqual(next.cards[0].records, updated.records);
  assert.equal(lib.recordEnd(next.cards[0]), '2026-09-03');
  assert.throws(
    () => lib.saveCardDraft(state, { ...draft, startDate: '2026-09-28' }),
    /开始日期/,
  );
});
await test('photo limits reject overflow before a record can corrupt saved state', () => {
  assert.throws(
    () =>
      save(
        card('blank'),
        entry({ photoIds: Array.from({ length: 10 }, (_, i) => 'photo-' + i) }),
      ),
    /9/,
  );
  assert.throws(
    () => save(card('blank'), entry({ photoIds: ['same', 'same'] })),
    /不同/,
  );
  assert.equal(
    save(card('blank'), entry({ photoIds: ['a', 'b'] })).records[0].photoIds
      .length,
    2,
  );
});
await test('same-millisecond stage changes use the last action without reordering records', () => {
  const c = card('stage');
  const stageId = c.stages[0].id;
  const timestamp = '2026-09-27T08:00:00Z';
  c.records = [
    entry({ stageId, stageDone: true, createdAt: timestamp }),
    entry({ stageId, stageDone: false, createdAt: timestamp }),
  ];
  const before = structuredClone(c);
  assert.equal(stageComplete(c, stageId), false);
  assert.deepEqual(c, before);
  assert.equal(lib.lastRecord(c).id, c.records[0].id);
});
await test('monthly reminder respects 30 days and session dismissal when persistent writes fail', () => {
  const now = Date.parse('2026-09-27T12:00:00Z');
  const since = now - lib.BACKUP_REMINDER_INTERVAL;
  assert.equal(lib.backupReminderDue(since, now - 1), false);
  assert.equal(lib.backupReminderDue(since, now), true);
  const dismissed = lib.backupReminderSince(since, now, now + 60000);
  assert.equal(dismissed, now);
  assert.equal(lib.backupReminderDue(dismissed, now + 60000), false);
  assert.equal(lib.backupReminderSince(NaN, null, now), now);
  assert.equal(lib.backupReminderSince(now + 1000, null, now), now);
  assert.equal(lib.backupReminderSince(now, since, now), now);
});
await test('example dates remain relative, contain today/tomorrow/future and resolve every illustration', () => {
  const demo = createDemoState('2027-01-01');
  validateState(demo);
  assert.equal(demo.cards.filter((c) => c.location === 'active').length, 4);
  assert.equal(
    lib.priorityCompanions(demo.companions, '2027-01-01')[0].targetDate,
    '2027-01-01',
  );
  assert.ok(demo.cards.some((c) => lib.cardDeadline(c) === '2027-01-02'));
  assert.ok(demo.companions.some((c) => c.targetDate === '2027-01-13'));
  const photoIds = lib.allPhotoIds(demo);
  assert.ok(photoIds.length >= 3);
  assert.ok(photoIds.every((id) => lib.DEMO_PHOTOS.some((p) => p.id === id)));
  assert.equal(
    progressValue(
      demo.cards.find((c) => c.kind === 'progress' && c.location === 'active'),
    ),
    77.5,
  );
});

await test('memory edits preserve structure and only update existing records', () => {
  const state = createDemoState(today);
  const memory = state.cards.find(
    (c) => c.location === 'memory' && c.kind === 'progress',
  );
  const original = memory.records[0];
  const edited = saveLifeRecord(
    memory,
    { ...original, body: '修正后的记录', delta: 1 },
    today,
  );
  assert.equal(edited.location, 'memory');
  assert.equal(edited.archivedAt, memory.archivedAt);
  assert.equal(
    edited.records.find((r) => r.id === original.id).body,
    '修正后的记录',
  );
  assert.equal(
    progressValue(edited),
    progressValue(memory) - original.delta + 1,
  );
  assert.throws(() =>
    saveLifeRecord(memory, { ...original, id: 'new-memory-record' }, today),
  );
  assert.throws(() =>
    saveLifeRecord(memory, { ...original, date: today }, today),
  );
  const saved = lib.saveCardDraft(state, {
    ...memory,
    title: '新的标题',
    summary: '新的感想',
    kind: 'blank',
    startDate: today,
  });
  const result = saved.cards.find((c) => c.id === memory.id);
  assert.equal(result.title, '新的标题');
  assert.equal(result.summary, '新的感想');
  assert.equal(result.kind, memory.kind);
  assert.equal(result.startDate, memory.startDate);
  assert.deepEqual(result.records, memory.records);
});
