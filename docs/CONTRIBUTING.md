# 贡献指南

感谢愿意帮忙。本项目是一个纯前端的明日方舟卫戍协议配队工具，改动大多集中在 `frontend/`，下面是你需要知道的全部约定。

## 环境要求

- Node.js 20 以上（CI 使用 24）
- npm（项目未使用 pnpm / yarn 的 workspace）
- 推荐 VS Code + Vue 官方插件

## 本地开发

```bash
cd frontend
npm install
npm run dev        # 开发服务器，注意地址带基路径 /Arknights-alliance-tool/
npm run test:run   # 单次跑完全部单测
npm run lint       # ESLint（正确性规则）
npm run typecheck  # vue-tsc，只做类型检查
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览生产构建，PWA / Service Worker 只在这里生效
npm run coverage   # 覆盖率报告（当前只测量，不设阈值）
```

`vite.config.ts` 里 `base` 固定为 `/Arknights-alliance-tool/`，用于 GitHub Pages 子路径部署。直接访问 `http://localhost:5173/` 会 404，这是预期行为，不要为了本地方便改 `base`。

依赖安装若遇到 npm 报 `Cannot read properties of null (reading 'edgesOut')`（npm 10 的已知问题），加 `--legacy-peer-deps` 可绕过。

## 代码分层

| 层 | 目录 | 允许做 | 禁止做 |
| --- | --- | --- | --- |
| 数据层 | `src/data` | 版本注册、数据集、纯函数式数据访问 | 读写 `localStorage`、引用 Vue 组件 |
| 领域层 | `src/features/*/domain`、`src/domain` | 纯业务规则：统计、筛选、Ban、上限、编解码映射；按功能就近放，跨 feature 的类型与 data 适配留在 `src/domain` | `import vue`、读写 `localStorage`、调用 `alert/prompt/confirm`、碰 DOM、反向 import `components` / `composables` |
| 响应式层 | `src/features/*/composables`、`src/app` | 把 ref 变成 computed、调用仓储、副作用 | 写业务规则（规则应放 `domain` 并单测）、直接读写 `localStorage`、调用 `alert/prompt/confirm` |
| 基础设施层 | `src/infrastructure` | 存储键常量、读写封装、按用途分组的仓储 | 判断数据是否合法（版本 id / 自选干员校验留在 composable）、引用 `composables` 或 `components` |
| 视图层 | `src/features/*/components`、`src/shared/components` | 渲染、交互、事件上抛、需要用户输入的询问（`prompt`）与提示文案 | 直接 `localStorage.setItem`、内联版本判断 |


补充约定：

- 组件不直接读版本数据文件，统一走 `useGameVersion()` 或 `data/versions.js` 的导出函数
- 新增规则时：先写 `features/<feature>/domain` 纯函数 → 在同目录 `tests/` 补用例 → 再由 composable / 组件调用
- 组件不自己拼图片路径，统一用 `shared/lib/assets.js` 的 `getAvatarUrl` / `getIconUrl` / `getEquipmentIconUrl`
- 只有 `App.vue` 作为组合根串联各 composable，子组件通过 props / emits 通信
- 新增跨组件共享状态时，优先在对应 feature 的 `composables` 里做模块级单例（参考 `game-version/composables/useGameVersion.js`）
- 需要跨模块写状态时用回调注入（参考 `useShareCode().importFromCode(data, { addTeam, addCollection })`），不要把别人的 ref 传进函数里 push

## 提交规范

采用 Conventional Commits，**描述用中文**，格式 `type(scope): 描述`。

| type | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `refactor` | 不改变外部行为的重构 |
| `style` | 纯样式 / 格式调整 |
| `test` | 测试相关 |
| `docs` | 文档 |
| `chore` | 依赖、构建、脚手架 |

scope 用模块名，例如 `feat(pool):`、`fix(mobile):`、`feat(share):`、`fix(formation):`。

示例：

```text
feat(pool): 新增特质筛选与 Ban 盟约筛选
fix(mobile): 统一移动端断点到 1024，修复展开干员池溢出
refactor(roster): 提取干员筛选逻辑
```

拆分原则：一次提交只做一件事。混合改动请拆开——样式调整不要塞进 `feat`，测试代码单独 `test:`，类型判定以主要改动为准。

## 代码规范

- Vue 3 `<script setup>`，组件文件 PascalCase，composable 以 `use` 开头
- 缩进 2 空格；模板属性较多时按属性分组换行，保持现有风格
- 导出的函数写 JSDoc（`@param` / `@returns`），内部辅助函数用一句话说明意图即可
- 注释解释「为什么」而不是「做了什么」，例如为什么会踩到某个浏览器行为
- 不做无意义的防御性判断，但涉及用户输入、分享码解析、`localStorage` 的地方必须 try/catch 并给出可读错误
- 不引入新的运行时依赖除非确有必要，当前运行时依赖只有 `vue`、`pako`、`vue-draggable-plus`

## 移动端约定

这部分是历史踩坑总结，改动移动端布局前请先读：

- 断点体系：`≤1024px` 侧栏与编队改为上下堆叠，`≤768px` / `≤420px` 细分尺寸
- `PoolPanel.vue` 里的 `MOBILE_QUERY` 必须与 CSS 的堆叠断点保持一致，否则会出现「JS 认为已折叠、CSS 还没堆叠」的错位
- 桌面端左右两栏用 `flex: 0 1 800px` / `flex: 1 1 560px`（保底 420px）让编队列先缩，操作区优先；移动端必须把 `min-width: 420px` 清掉，否则横向溢出
- 移动端侧栏 / 编队列要 `overflow: visible`：桌面端的 `overflow-y: auto` 在触屏上会形成内部滚动陷阱，手指落在侧栏只能滚侧栏
- 整页滚动容器不要用 `overscroll-behavior` 掐断滚动链，会让页面彻底滑不动
- 触屏拖拽必须配 `delayOnTouchOnly + delay + touchStartThreshold`，否则会劫持页面滚动；干员池在移动端直接禁用拖拽，改为点按添加
- 悬停提示在触屏上没有 `mouseleave`，统一由 `isCoarsePointer()` 判断并改为定时自动消失

## 分享码兼容性铁律

分享码里存的是**名字在码表中的下标**，一旦顺序变化，历史码全部解析错。

- `src/data/opCodebook.json`、`src/data/equipCodebook.json` 只允许在**末尾追加**，禁止重排、删除、去重
- 追加码表用 `npm run codebook`，不要手写编辑
- `shareCodec.js` 的 `VERSION_CODES` 只允许追加，不能插入或调换
- 协议 magic 已分配：`0xc0` 无装备、`0xd0` 带装备。新格式请再开一个 magic，让旧解码器直接判为无效而不是错读
- **`src/tests/shareCompat.spec.js` 里固定了几条分享码快照**，是协议的唯一权威断言。它红了先确认「协议是否真的需要变」，默认应当修实现而不是改快照
- 任何编解码改动都要补 `useShareCode.spec.js` 的往返测试，并确认旧码仍可解析

全量导出（`ARKFULL` / `type=3`）已在 P1 删除：它从未上线过 UI，也没有历史码。

## 数据更新流程

赛季更新或 PRTS 数据修正时：

1. 从 PRTS 对应页面取数（链接见 README「数据说明」）
2. 修改 `src/data/` 下的数据文件，字段含义见 [architecture/data-model.md](../architecture/data-model.md)
3. 若新增了干员 / 装备，执行 `npm run codebook` 追加码表
4. 确认 `src/data/versions.js` 里的版本文案（`desc` / `source` / `coreCovenants` 相关统计）仍然成立
5. 跑 `npm run test:run`，数据完整性测试会校验版本数量、核心盟约数量、跨版本差异
6. 若数据规模变化明显（如装备数、干员数），同步更新 README 表格中的数字

> 测试里的干员总数、盟约数已改为从数据推导（`Object.keys(operators).length`），赛季扩池不会造成假红。

新增一个游戏版本时：

1. 在 `src/data/` 放 `covenants.<id>.json`、`operators.<id>.json`（有装备再加 `equipment.<id>.json`）
2. 在 `versions.js` 的 `GAME_VERSIONS` 末尾追加注册项，声明 `selfOperatorStrategy`、必要时 `banStrategy`
3. 在 `shareCodec.js` 的 `VERSION_CODES` 末尾追加版本 id
4. 补 `gameVersion.spec.js` 的版本断言

## 测试

- 新增业务规则：写到对应 feature 的 `domain/`，并在同 feature 的 `tests/domain.<模块>.spec.js` 补用例（纯函数，不用 mount 组件）
- 新增 composable / 数据访问函数：补对应单测
- 修 bug：先写能复现的断言，再改代码
- 涉及导出的 UI 交互（拖拽、装备角标、筛选）可参考 `equipmentUi.spec.js` 的写法
- 提交前确保 `npm run test:run` 全绿；纯文档改动可跳过

## 提 PR

1. 从 `master` 切分支，命名 `feat/xxx`、`fix/xxx`
2. 提交前自查：`npm run build` 能过（含类型检查）、测试全绿、控制台无新报错
3. PR 描述写清「改了什么 / 为什么 / 怎么验证」，涉及 UI 请附截图或录屏
4. 涉及架构调整时，同步更新 `architecture/` 下对应文档；变更记录由维护者按里程碑整理，不必手动改 `CHANGELOG.md`
5. 一个 PR 只解决一个问题，避免顺手重构无关代码

## 文档

- 面向使用者：`README.md`
- 面向维护者：`architecture/*.md`
- 计划中的架构改动、临时方案记录在 PR 描述里，不要散落在代码注释

## 协议

提交即表示同意以 [MIT](../LICENSE) 协议发布你的贡献。
