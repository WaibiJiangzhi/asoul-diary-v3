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
- 当前仍处于个人试用阶段，不做 v2 数据迁移；正式发布前再确定迁移策略。

## 构建

- 本地开发与 Workers：`npm run build`
- Cloudflare Pages 静态输出：`npm run build:pages`
- 完整本地检查：`npm run check`

Pages 和 Workers 都是保留的发布出口。架构整理不得改变两者现有行为。

## 修改原则

优先把新逻辑放进对应控制器或 `lib`，界面组件保持以展示为主。只在真实需求出现时增加抽象，不为未来原生 App 预写空壳；未来可复用的核心是数据类型、业务规则和备份格式，而不是网页 UI。
