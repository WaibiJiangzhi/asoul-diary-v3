import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';
import { IDBFactory } from 'fake-indexeddb';

// Run from app: node scripts/generate-stress-sample.mjs [YYYY-MM-DD]
const today =
  process.argv[2] ??
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
const day = (offset) =>
  new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86400000)
    .toISOString()
    .slice(0, 10);
const stamp = (date) => `${date}T12:00:00.000Z`;
const { outputFiles } = await build({
  stdin: {
    contents:
      "export { createDefaultState } from './lib/defaults'; export { validateBackup } from './lib/backup-validation'; export { restoreBackup, loadState, getPhotos } from './lib/db';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const api = await import(
  'data:text/javascript;base64,' +
    Buffer.from(outputFiles[0].text).toString('base64')
);
const state = api.createDefaultState();
state.settings.theme = 'wallpaper';
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
const emojis = [
  '[2026乃琳的酒馆动态表情包_厨艺展示]',
  '[嘉然_笔芯]',
  '🌱',
  '🏃',
  '🎨',
  '🎹',
  '📚',
  '⛰️',
];
const titles = {
  record: [
    '把作息慢慢调回来',
    '认真吃饭和喝水',
    '每天出去走走',
    '给自己留一点安静时间',
    '记录今天的心情',
    '每天读一点喜欢的书',
  ],
  progress: [
    '秋天慢慢跑 100 公里',
    '读完书架上的故事',
    '积累一百小时钢琴练习',
    '画完自己的速写本',
    '把游泳变成生活的一部分',
    '为下一次旅行攒一点钱',
  ],
  stage: [
    '准备一次喜欢的旅行',
    '完整学会一首喜欢的歌',
    '做出第一支二创视频',
    '整理一个舒服的小房间',
    '把论文慢慢写完',
    '做一顿完整的晚餐',
  ],
  blank: [
    '把脑海里的画面画出来',
    '收藏生活里的小小惊喜',
    '写给未来的自己',
    '那些突然冒出来的灵感',
    '和喜欢的人一起度过的日子',
    '漫无目的也很好的周末',
  ],
};
const paragraphs = [
  '今天没有特别厉害的事情，但我还是往前走了一点。',
  '开始之前有点犹豫，做起来之后反而轻松了。给自己一点耐心。',
  '中间休息了一会儿，也调整了原来的计划。不是每一天都要一样。',
  '晚上回头看，能留下这些真实的小事，已经很好。下次想换一种方法试试。',
];
const photos = [];
for (let i = 0; i < 120; i++) {
  const kind = ['record', 'progress', 'stage', 'blank'][i % 4];
  const location = i < 36 ? 'active' : i < 60 ? 'later' : 'memory';
  const end = location === 'memory' ? -7 - (i - 60) * 5 : 0;
  const start = end - 179;
  const c = {
    id: `stress-card-${i}`,
    kind,
    title: `${titles[kind][Math.floor(i / 4) % 6]} · 第 ${Math.floor(i / 24) + 1} 期`,
    emoji: emojis[i % emojis.length],
    note:
      i % 7 === 0
        ? paragraphs.join('')
        : '按自己的节奏慢慢来，记录那些真实发生过的变化。',
    color: colors[i % 9],
    location,
    startDate: day(location === 'later' ? 0 : start),
    createdAt: stamp(day(location === 'later' ? 0 : start)),
    updatedAt: stamp(day(end)),
    records: [],
  };
  if (kind === 'record') {
    c.record = {
      states: [
        '很有精神',
        '慢慢来',
        '休息一下',
        '有点疲惫',
        '出去走了走',
        '想说点什么',
      ]
        .slice(0, i % 8 === 0 ? 6 : 3)
        .map((name, j) => ({
          id: `status-${j}`,
          name,
          emoji: j === 5 ? '' : emojis[(i + j) % 8],
          color: colors[j],
        })),
    };
    if (i % 12 !== 0)
      Object.assign(c.record, {
        periodDays: 180,
        targetStateId: 'status-0',
        targetDays: 45,
      });
  }
  if (kind === 'progress')
    c.progress = {
      initial: 0,
      total: i % 12 === 1 ? 100 : 1000,
      unit: i % 8 === 1 ? 'km' : '页',
      step: i % 8 === 1 ? 3 : 10,
      expectedDate: day(i % 3 === 0 ? -3 : 30),
    };
  if (kind === 'stage')
    c.stages = [
      '认真想一想',
      '找些参考',
      '列出小计划',
      '试着开始',
      '遇到困难再调整',
      '完成初稿',
      '打磨细节',
      '给自己一个纪念',
    ]
      .slice(0, i % 8 === 2 ? 8 : 4)
      .map((title, j) => ({ id: `stage-${j}`, title }));
  if (location !== 'later')
    for (let j = 0; j < 180; j++) {
      // Leave scattered gaps, while keeping the latest week populated.
      if (j < 170 && j % 13 === 0) continue;
      const date = day(start + j),
        r = {
          id: `stress-record-${i}-${j}`,
          date,
          body: `${paragraphs[j % 4]}\n${j % 9 === 0 ? paragraphs.join('\n').repeat(4) : '今天的片段：' + ['清晨的风', '练习后的晚饭', '回家的路', '一页新的草稿'][j % 4]} ${emojis[(i + j) % 8]}`,
          photoIds: [],
          createdAt: stamp(date),
          updatedAt: stamp(date),
        };
      if (kind === 'record' && j % 11 !== 0)
        r.statusId = `status-${j % c.record.states.length}`;
      if (kind === 'progress')
        r.delta =
          j % 19 === 0 ? 0 : j % 17 === 0 ? -0.5 : j % 3 === 0 ? 1.5 : 1;
      if (kind === 'stage' && j % 20 === 0) {
        r.stageId = `stage-${Math.floor(j / 20) % c.stages.length}`;
        r.stageDone = j !== 80;
        r.stageEmoji = r.stageDone ? emojis[j % 8] : undefined;
      }
      if (j === 175 || j === 178)
        for (let k = 0; k < (j === 178 ? 9 : 3); k++) {
          const id = `stress-photo-${i}-${j}-${k}`,
            w = k % 3 === 0 ? 480 : k % 3 === 1 ? 240 : 360,
            h = k % 3 === 0 ? 240 : k % 3 === 1 ? 480 : 360;
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${colors[(i + k) % 9]}"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${w * 0.16}" fill="#fff8db"/><path d="M0 ${h} L${w * 0.35} ${h * 0.4} L${w * 0.6} ${h * 0.75} L${w} ${h * 0.5} L${w} ${h}Z" fill="#fff" opacity=".5"/><text x="20" y="35" font-size="20" fill="#fff">TEST ${i}-${j}-${k}</text></svg>`;
          const bytes = await sharp(Buffer.from(svg))
            .webp({ quality: 75 })
            .toBuffer();
          photos.push({
            id,
            name: `测试插画-${i}-${j}-${k}.webp`,
            createdAt: stamp(date),
            dataUrl: `data:image/webp;base64,${bytes.toString('base64')}`,
          });
          r.photoIds.push(id);
        }
      c.records.push(r);
    }
  if (location === 'memory')
    Object.assign(c, {
      archivedAt: stamp(day(end)),
      ending: 'closed',
      summary: `这一期告一段落了。\n${paragraphs.join('\n')} ${emojis[i % 8]}`,
    });
  state.cards.push(c);
}
state.commonCards = state.cards.slice(0, 36).map((c, i) => ({
  ...structuredClone(c),
  id: `stress-common-${i}`,
  location: 'active',
  startDate: today,
  createdAt: stamp(today),
  updatedAt: stamp(today),
  records: [],
}));
state.companions = Array.from({ length: 24 }, (_, i) => ({
  id: `stress-companion-${i}`,
  kind: i % 2 ? 'countdown' : 'quote',
  title:
    i % 2
      ? ['去看喜欢的演出', '一次期待很久的旅行', '给自己的纪念日'][i % 3]
      : ['你的梦想是什么？', '慢慢来，也是在向前', '今天也要好好喜欢自己'][
          i % 3
        ],
  note: paragraphs[i % 4],
  emoji: emojis[i % 8],
  ...(i % 2
    ? { targetDate: day([-14, 0, 1, 7, 30, 120][Math.floor(i / 2) % 6]) }
    : {}),
}));
const backup = {
  product: 'asoul-life-v3',
  exportedAt: stamp(today),
  state,
  photos,
};
api.validateBackup(backup);
// Exercise the actual importer in an isolated, in-memory database, never the browser database.
globalThis.indexedDB = new IDBFactory();
globalThis.window = { setTimeout, clearTimeout };
await api.restoreBackup(backup);
assert.deepEqual(await api.loadState(), state);
assert.equal(
  (await api.getPhotos(photos.map((p) => p.id))).length,
  photos.length,
);
const output = 'fixtures/life-full-test-backup.json';
await mkdir('fixtures', { recursive: true });
await writeFile(output, JSON.stringify(backup, null, 2) + '\n');
const stats = {
  date: today,
  cards: state.cards.length,
  active: 36,
  later: 24,
  memories: 60,
  commonCards: state.commonCards.length,
  companions: 24,
  records: state.cards.reduce((n, c) => n + c.records.length, 0),
  photos: photos.length,
};
await writeFile(
  'fixtures/life-full-test-backup.README.md',
  `# 大数据量测试备份\n\n生成基准日：${today}。所有内容均为合成测试数据，照片是带 TEST 编号的测试插画。\n\n${Object.entries(
    stats,
  )
    .map(([k, v]) => '- ' + k + ': ' + v)
    .join(
      '\n',
    )}\n\n在设置的数据备份区选择导入 JSON。导入会替换当前生活数据，请先导出自己的备份，或在独立浏览器测试。生成文件本身没有修改任何浏览器数据。\n\n覆盖：四种卡片、六种状态、文字状态、表情包、长文、多年日期、同日多卡记录、漏记、正负及零进度、超额进度、阶段撤回、横竖方图、单条九图、常用卡片、以后想做、纪念册、过去/当天/未来倒计时。纪念册样例为主动结束，可测试再来一期。\n\n验证：使用当前备份校验器，并在 fake-indexeddb 中调用真实导入函数，核对全部状态和照片数量。该检查不代表真机性能测试。\n\n重新生成：在 app 目录运行 node scripts/generate-stress-sample.mjs，可追加 YYYY-MM-DD 指定基准日。\n`,
);
console.log(JSON.stringify(stats, null, 2));
console.log('Validated importer round-trip: ' + output);
