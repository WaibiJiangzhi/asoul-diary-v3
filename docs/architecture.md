# v3 架构

## 边界

- `app/components/diary-app.tsx`：组合根，只连接页面、抽屉、全局提示和控制器。
- `app/components/diary`：今日、成长、日记与设置的界面组件。
- `app/hooks/use-*-controller.ts`：按业务板块组织用户操作和状态变更。
- `app/hooks/use-diary-state.ts`：加载、自动保存、跨天清理与主题同步。
- `app/hooks/use-app-update.ts`：安装提示和 Service Worker 更新。
- `app/hooks/use-diary-webmcp.ts`：可选的浏览器代理能力，不影响普通使用。
- `app/lib`：数据类型、默认值、日期规则和 IndexedDB 存储。
- `app/styles`：外壳与三个板块的样式；主题色通过全局 CSS 变量统一传递。

## 数据流

`IndexedDB → useDiaryState → DiaryApp → 页面 / 控制器 → AppState → 自动保存`

- `state` 对象保存事项、成长、日记、日期标记与设置。
- 照片 Blob 单独保存在 `photos` 对象仓库，日记只保存照片 ID。
- 每日事项只保留昨天、今天和明天；收进日记的快照长期保存。
- 完整备份同时包含 `AppState` 和照片数据。
- 圆环卡使用进度卡的可选 `challenge` 配置，包含 1–4 个有稳定 ID 的状态（名称、颜色、表情），以及一份可选的状态天数期待。事件以日期和状态 ID 标记每天的记录，`lib/challenge.ts` 负责日期范围、去重、统计和首次达到期待的标记；零增量事件保存独立文字足迹。归档保留配置和事件，日记快照保存当天的状态文案。
- 取消当天状态时保留文字足迹，撤销只恢复该日的事件；不回滚其他日期或日记副本。
- 圆环的日期视图按开始日顺时针排列，总览把相同状态合并并把期待状态放在最前。两者都以完整周期为分母，区分待记录和未来日期；只有总览显示期待刻度。`challengeSegments` 合并相邻同类日期，CSS 连续色环不添加分隔缝，单色满圈直接使用纯色。可见卡片首次进入或切换视图时顺时针揭开圆环，数字保留真实值，并遵循系统减少动态效果偏好。
- 累计进度的 `expectedDate` 是可选期待，不限制继续记录；归档和恢复保留日期，再来一期不沿用旧日期。两种进度共用 `growth-calendar.tsx`，按所选日期查看足迹；`lib/progress.ts` 负责记录日期与累计调整，旧足迹按原时间戳的本地日期显示。补记只增加对应日期的事件，不改动已保存的日记快照。
- 当前仍处于个人试用阶段，不做 v2 数据迁移；正式发布前再确定迁移策略。

- 已访问板块在本次会话内保留组件和滚动位置；成长横滑容器按当前卡片自然高度展示。日历共用选中与焦点样式，日记选日后翻页，成长选日后继续查看足迹。

## 表情与正文

- `lib/sticker-catalog.json` 由 `scripts/import-stickers.mjs` 从本地原件生成。系列顺序取自目录前缀；文件名中的原始代号用于复制与存储，资源路径以代号的摘要命名。原件留在被忽略的素材目录，网页使用 `public/stickers` 中的资源。
- `lib/stickers.ts` 统一代号解析。`Decoration` 在事项、卡片与快照中呈现 Emoji 或图片，`StickerPanel` 在单层横栏切换系列；`DecorationPicker` 把它用于设置抽屉。最近使用和上次打开的系列只是设备偏好。
- 日记正文仍存为纯文本，图片以 `[系列_名称]` 代号保存。`JournalEditor` 编辑时显示目录内的图片，复制与剪切写入纯文本代号；粘贴只接受纯文本，未知代号原样保留，外部 HTML 不进入正文。
- `lib/journal-content.ts` 负责编辑节点和文本、光标之间的转换。编辑器用范围插入和最多 100 步的本页撤销记录管理图片与文字，输入法组字结束后才提交内容。编辑面板通过 Portal 固定在页面底部，`useVisualViewport` 跟随可见视口；切换表情前保存光标并收起输入法。移动输入法的弹出、候选词和切换动画仍需 Android/iOS 真机验证。
- `settings.journalLines` 控制正文横线，默认关闭。照片仍使用原有本地 Blob 存储。

## 构建

- 本地开发与 Workers：`npm run build`
- Cloudflare Pages 静态输出：`npm run build:pages`
- 完整本地检查：`npm run check`
- 记录与表情规则：`npm run test:records`

Pages 和 Workers 都是保留的发布出口。架构整理不得改变两者现有行为。

## 修改原则

优先把新逻辑放进对应控制器或 `lib`，界面组件保持以展示为主。只在真实需求出现时增加抽象，不为未来原生 App 预写空壳；未来可复用的核心是数据类型、业务规则和备份格式，而不是网页 UI。
