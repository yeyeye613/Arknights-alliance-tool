# 变更记录

本项目的所有重要变更都记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 说明：仓库尚未创建 git tag。下面的版本号按**里程碑提交区间**划分，日期为区间内最后一次提交的日期；版本号与 `frontend/package.json` 的 `version` 字段（当前仍是脚手架默认的 `0.0.0`）暂未同步。

## [Unreleased]

### 变更

移动端交互按**指针能力**（`hover: hover` 且 `pointer: fine`）分叉，不再按屏幕宽度判断——触屏即使排成两列也拖不准，长按拖拽还会抢走页面滚动：

- 干员池改为单击看详情、双击加入编队；详情浮层固定显示，点空白处关闭
- 加入编队后提示「已加入「X」（3/8）」，满员仍提示上限
- 装备池与临时装备池的文案在触屏上只讲点选，有鼠标时仍可拖拽
- 折叠条抽成 `CollapseBar`，干员池与装备池在窄屏都能收起

### 重构

架构审计后的 P0 / P1 两步（详见 [docs/architecture/refactoring-plan.md](architecture/refactoring-plan.md)），产品行为不变：

- **新增 `src/domain/` 领域层**：`covenantStats`（盟约统计）、`filterOperators`（筛选与 Ban）、`teamRules`（上限、跨版本判定、版本回退）、`equipRules`（槽位、变形同构体、组合装、装配校验）、`shareImport`（分享码解析与导入映射）全部改为无 Vue 依赖的纯函数，`src/domain/*.ts` 附带类型定义
- `useCovenantStats` 只保留响应式胶水；`versionSource` 参数可选，不传时才回退到全局当前版本
- `useShareCode().importFromCode` 由 8 个位置参数改为 `(data, { versionId, addTeam, addCollection, notify, close })`，不再直接 push 调用方的 `savedTeams` / `teamCollections`
- `useShareCode().shareTeam / shareCollection` 移除，分享弹窗状态改由 `App.vue` 组装
- `useTeamStorage().saveTeam / updateTeam` 去掉未使用的 `team` 参数（改从 `teamData.team` 取值）
- 盟约统计合并为单次遍历（原先同一编队扫两遍、每名干员的盟约解析重复计算）
- `data/equipment.js` 只保留数据访问，规则部分 re-export 自 `domain/equipRules`（过渡用，P4 已删除）

#### P2 组件拆分

三个巨型面板按职责拆开，DOM 结构、class 名、样式数值与文案均保持不变：

- `PoolPanel` 1355 → **418 行**：拆出 `PoolFilters`（筛选面板）、`CovenantFilterRow`（盟约行，图标 / 文字两形态）、`OperatorCard`（干员卡片唯一定义）
- `TeamPanel` 816 → **367 行**：拆出 `TeamHeader`、`OperatorSlot`（卡片 + 删除 + 装备角标）、`ActiveEffectsList`
- `SavedTeamsPanel` 527 → **356 行**：两条重复的编队条目合并为 `TeamCard`
- 新增 `composables/usePoolFilters.js`：6 个筛选维度 + Ban 列表 + 折叠 / 视图偏好持久化 + 已选摘要 + 切版本清理
- 新增 `composables/useSelfOperators.js`：自选干员的读取校验与落盘，`PoolPanel` 不再直接碰 `localStorage`
- 新增 `composables/useTooltip.js`：`useTraitTooltip` 与 `useCovenantTooltip` 原本约 95% 重复，现共用定位 / 贴边收拢 / 触屏自动消失；两个浮层组件仍各自独立
- 新增 `components/filter-controls.css`：`PoolFilters` 与 `CovenantFilterRow` 共用 `.chip` / `.chip-list` / `.icon-filter-row` / `.row-label`，用 `<style scoped src>` 引入，避免同一套外观写两份
- `.op-unit` 由两处定义（干员池 75px / 编队 78px）收敛为 **`OperatorCard` 一处、统一 75px**；8 人一行 670px，比原 694px 更宽裕

#### P3 基础设施收敛

持久化与浏览器对话框都从业务代码里抽离，**存档键名与字段结构零改动**：

- 新增 `src/infrastructure/storage/`：`keys.ts`（6 个键名常量，值冻结）、`localStore.ts`（`readJSON` / `writeJSON` / `readText` / `writeText`，统一异常兜底）
- 新增 `teamsRepository.ts` / `preferencesRepository.ts`：编队与合集、四类偏好的存取；`expanded` 只在内存里存在，落库剥离、读回置 `true`
- `useGameVersion` / `usePoolFilters` / `useSelfOperators` / `useTeamStorage` 内不再出现 `localStorage`，`src` 中只有 `infrastructure/` 与测试会提到它
- `useTeamManagement().addToTeam`、`useModalState().openSaveTeamModal` 改为返回 `boolean`，满员 / 空编队的提示交给 `App.vue`；「移动到合集」的 `prompt` 移到 `SavedTeamsPanel`
- 合集引用由数组下标改为**合集名 + `teamIndex`**，`SaveTeamModal` 的下拉值直接是合集名
- 合集展开态改由 `App.vue` 维护，`SavedTeamsPanel` 不再修改 props

修复：

- 保存编队时选第一个合集会落到「不归类」（`index || null` 把 `0` 当成空值）
- 合集内「移动到合集」实际是复制：源合集没有移除条目，还会把未分类列表里同序号的编队一起搬走

#### P4 目录迁移

按功能重组源码目录，**只移动文件与改写 import，逻辑零改动**。存档键名、分享码协议、组件行为均不变：

- 顶层从「按文件类型平铺」改为「按功能切分」：`app/`（组合根、入口、全局样式、模态状态）、`features/*`（roster / formation / covenants / equipment / library / sharing / game-version）、`shared/`（弹窗骨架、浮层控制器、图片地址）、`infrastructure/`（storage + pwa）
- 每个 feature 自带 `components/` `composables/` `domain/` `tests/`；领域文件从集中的 `src/domain/` 分散到各 feature，`src/domain/` 只留跨 feature 的 `versionAdapter.ts` 与 `types.ts`
- 测试跟着功能走：18 个用例文件迁到对应 feature 的 `tests/`，`src/tests/` 只留冒烟、分享码兼容、存档兼容与分层护栏
- 改名：`AddOpPanel` → `SelfOperatorDialog`、`ShareModal` → `ShareDialog`、`ImportModal` → `ImportDialog`、`SaveTeamModal` → `SaveTeamDialog`、`useTeamStorage` → `useSavedTeams`
- 数据集命名对齐：`covenants.json` → `covenants.mengyue.json`、`operators.json` → `operators.mengyue.json`、`selfOp.json` → `selfOperators.json`；`versions.js` 与 `scripts/gen-codebook.mjs` 同步
- `data/equipment.js` 删掉对 `equipRules` 的 re-export，只保留装备数据访问（`TIER_LABELS` / `getEquipments` / `findEquipment` / `getEquipmentList`）
- `src/tests/domainBoundaries.spec.js` 改为递归扫描所有名为 `domain` 的目录，不再写死单一路径
- 覆盖率配置的排除项补 `src/**/tests/**`，避免用例被算进源码分母

#### P5 清理与类型化

结构性的收尾：清死代码、收口跨 feature 依赖、把类型从「跨层垃圾桶」搬进实体层，
并给两个最容易静默出错的文件加上类型约束。**行为零改动，存档与分享码协议不变**。

- 新增 `src/entities/`：`version` / `covenant` / `operator` / `equipment` / `team`，
  放实体类型与数据访问器；依赖方向只有 `entities → data`。`src/domain/` 随之消失
- 每个 feature 新增 `index.ts` 作为唯一对外入口，跨 feature 与 `app/` 不再深引；
  `domain/` 之间保留直连（纯规则不该经过 re-export 组件的桶）
- 新增 `src/tests/featureBoundaries.spec.js`：扫源码强制「只从桶导入」，
  并对深引、桶导入、domain 直连、同 feature 深引四种情形分别断言
- `useModalState`（96 行 / 21 项）拆成 `app/useTeamDialog` + `features/sharing/useShareDialogs` + `app/useToast`
- `shareCodec.js` → `shareCodec.ts`：只加类型，varint / Base62 / magic / 72 字节阈值一个表达式未动；
  4 条 v3 快照与 v1/v2 历史码全部原样通过
- `data/versions.js` 开 `@ts-check`：加 `VersionEntry` / `VersionLike` 两个 JSDoc 类型，
  注册表字段写错（如 `operator` 少个 s）现在在 `vue-tsc` 阶段报错，而不是运行时静默 undefined
- 删除 `covenant.operators`：两个 JSON 共 49 处，运行时 0 读取
- 引入 `knip`（`npm run knip`）并清理到 0 输出：删 `findEquipment` / `getOperatorVersionIds`
  两个死函数，收窄 7 个只在模块内使用的导出
- 依赖清理：移除未使用的 `gh-pages`（部署走 GitHub Action），补声明 `@eslint/js`

#### S13 错误契约与 D3 形状契约

两项技术债（方案见 [debt-plan.md](architecture/debt-plan.md)）。**用户可见行为不变，分享码协议不变**：

- 新增 `features/sharing/domain/shareErrors.ts`：13 个 `ShareErrorCode` + `ShareError`，
  领域层原本 15 处 `throw new Error("<中文>")` 全部改为抛 code；文案迁到
  `features/sharing/messages.ts`，由 `shareMessageOf(error, 兜底)` 取
- 错误码与改前 13 条不同文案一一对应，不做合并——合并即改变边界输入下用户看到的话
- `pako.inflate` 失败原本把英文报错透到界面，现统一转成 `DATA_CORRUPT`
- `shareCompat.spec.js` 的文案断言改为校 code，4 条协议快照一个字符未变
- `domainBoundaries.spec.js` 新增两条护栏：`domain/` 抛错带中文即失败；`domain/` 不得
  import `shared/lib/assets`（那里依赖 `import.meta.env.BASE_URL`）
- `OperatorInstance` 只保留 `name` / `tier?` / `isSelfOperator?` / `equipments`：
  `avatar` 改为按名字现算，`id` 改由 `operatorKey` 派生（`self:` 前缀区分来源）
- 五个构造点（版本池、自选池、自选弹窗、分享码导入、自选读档）统一走
  `createOperatorInstance`，`equipments` 恒为数组
- 列表 key 由 `op.id` 换成 `operatorKey(op)`，共 7 处（干员池 + 4 个预览列表）
- 自选干员配额提成 `MAX_SELF_PER_TIER`，文案与计数标签改为插值；两处 `alert` 改走 toast
- 存档不写迁移脚本：旧档多余的 `avatar` / `id` 对读取无害，下次保存时由构造器覆盖

修复：

- 顶部提示连续触发时，前一条的计时器会把后一条提前清掉；现在先 `clearTimeout` 再起新的，
  并在 effect scope 销毁时释放

### 移除

- 全量导出（`generateFullCode` / `encodeFull` / `ARKFULL` 前缀 / v3 `type=3` 解码分支）：从未上线 UI，也无历史码
- `App.vue` 中 4 个未使用的 composable 解构（`createTeamFromData`、`createCollectionFromData` 等）

### 测试

- 新增 `src/domain` 纯函数测试 80 条：`domain.covenantStats`（23）、`domain.filterOperators`（25）、`domain.teamRules`（10）、`domain.equipRules`（22）
- 新增 `domainBoundaries.spec.js`（4 条）：读源码校验 `domain/` 不依赖 Vue、不碰 `localStorage` / `alert` / DOM、不反向依赖组件
- 新增 `shareCompat.spec.js`（14 条）：锁定 4 条 v3 分享码快照、覆盖 v1/v2 历史码解析、`ARKCOL` 合集分支、未知干员跳过、非法输入
- 修复 `mobilePool.spec.js` 的假绿：`matchMedia` 桩原先把查询串写死为 `768px` 且忽略入参，与实现的 `1024px` 不符却永远通过；现在只在查询串匹配时返回结果，并直接断言组件查询的断点
- 干员总数 / 装备数 / 变形同构体数等规模断言改为从数据推导，赛季更新不再假红
- 新增 `storageCompat.spec.js`（7 条）：旧存档逐字读回、`expanded` 重置与剥离、键名不变、损坏与非法结构回退
- 新增 `collectionRefs.spec.js`（4 条）与 `savedTeamsPanel.spec.js`（5 条）：合集按名字定位、移动不误伤未分类列表，先红后绿
- 新增 `useTeamManagement.spec.js`（4 条）、`useTeamDialog.spec.js`（3 条，原 useModalState）：记录「用返回值而不是对话框表达拒绝」的契约
- 新增 `featureBoundaries.spec.js`（3 条）、`useToast.spec.js`（3 条）、`useShareDialogs.spec.js`（3 条）
- P0–P1 累计 87 → 186，P3 后 186 → 209（P4 只搬目录，用例数与断言不变），P5 后 209 → 218

### 工程

- 引入 ESLint 9（扁平配置，`vue/essential` + `@typescript-eslint` recommended）与 Prettier
- `vitest --coverage`（v8）可用，先只测量不设阈值
- `package.json` 新增 `lint` / `lint:fix` / `format` / `format:check` / `typecheck` / `test:run` / `coverage`
- `tsconfig.app.json` 开启 `allowJs` 并补 `@/*` 路径映射，使 `domain/*.ts` 能引用 JS 模块并通过 `vue-tsc`

### 文档

- 重写根目录 `README.md`：补充真实截图、双版本与装备能力、分享码 v3 说明、文档索引
- 新增 `CONTRIBUTING.md`：贡献流程、分层约定、提交规范、移动端与分享码兼容铁律、数据更新流程
- 新增 `architecture/overview.md` / `module-map.md` / `data-model.md` / `data-flow.md`
- 新增 `docs/architecture/refactoring-plan.md`：架构审计结论与 P0–P5 重构计划
- 新增 `CHANGELOG.md`、`SECURITY.md`、`LICENSE`（MIT）
- `frontend/README.md` 改为指向根目录，避免两份文档漂移
- 截图存放于 `docs/screenshots/`

## [0.7.0] - 2026-11-16

装备体系的界面收尾，以及一轮集中的移动端滚动问题修复。

### 新增

- 装备池独立标签页；临时装备池嵌入编队干员下方，无装备时不占位（`50653c3`）
- 盟约按钮三态切换：未选 → 筛选 → Ban → 取消 Ban，同一组按钮承担两种语义（`f8dd59f`）

### 变更

- 移动端间距加大，视图切换（图标 / 文字）移入筛选展开区（`1a58555`）

### 修复

- 规程版 Ban 阵营即隐藏该阵营全部干员，不再要求干员全部盟约被 Ban（`af5a8a9`）
- 移动端断点统一到 1024px，修复展开干员池时的溢出（`70547ad`）
- 触屏拖拽抢占页面滚动：为 Sortable 补上延迟与启动阈值（`71c2b38`）
- 移动端横向溢出与双层滚动（`8313117`）
- 消除嵌套滚动陷阱，修复移动端滑动不下去（`4ea907f`）
- `overscroll-behavior` 掐断滚动链导致整页无法滑动（`12dfc43`）

## [0.6.0] - 2026-11-09

从「单赛季配队表」升级为「多版本 + 装备 + 离线可用」的工具。

### 新增

- 游戏版本切换与规程赛季数据；悬停干员展示盟约与特质（`d5d248a`）
- 干员池特质筛选与 Ban 盟约筛选（`c3375d5`）
- 筛选区可折叠，阵营 / 盟约支持图标与文字两种展示（`e4dbc30`）
- 移动端适配、盟约悬停效果、PWA 缓存层（外壳预缓存 + 图片运行时缓存）（`3107b86`）
- 装备池与双装备槽，实现「变形同构体」盟约加成（`d983e10`）

### 变更

- 分享码改用 v3 二进制协议，单编队 235 → 40 字符；新增版本标识，仍兼容 v1/v2 旧码（`cfeec7e`）

## [0.5.0] - 2026-06-03

### 新增

- 自选（甄选）干员，五阶 / 六阶各限 2 名（`37a3d7b`）
- 盟约进阶效果的展示与统计（`56e84da`）

### 变更

- 自选干员交互重构：切换选择逻辑、跨阶转移、选择状态本地持久化；分享码升至 v2 以保存自选状态（`bf2989f`）
- 自选相关样式调整（`143985c`）

### 文档

- 补充开发说明（`06fc0b6`）、完善 README（`6029c29`）

## [0.4.0] - 2026-04-30

以可维护性为目标的重构窗口，未改变外部行为。

### 变更

- 函数拆分与组件职责收敛（`f70d5d9`）
- 拆出 `useTeamOperations`（`09c4ad2`）
- 盟约展示移入独立区域（`8c17388`）
- 简化 `isEffectsExpanded` 状态管理（`a3b8731`）

### 文档

- 为主要函数补充 JSDoc（`a46ea0b`）

### 维护

- 跟进卫戍协议数据调整（`c6e4630`）
- 一度加入 Vue DevTools 后又移除（`b8f7bf5`、`498eea5`）

## [0.3.0] - 2026-03-25

工具从「展示」走向「可用」。

### 新增

- 基础编队功能（`c130788`）
- 编队分享功能（`edb33d4`）

### 变更

- 组件拆分，抽出面板与弹窗（`3460b70`）
- 手机端样式适配（`6ab4951`）

### 测试

- 引入 Vitest，开始编写测试用例（`9668ba5`、`154288b`）

## [0.2.0] - 2026-03-23

### 新增

- GitHub Pages 部署与自动发布工作流（`b398229`）
- 多盟约筛选（`e84c6d0`）

### 变更

- 盟约逻辑从组件中分离（`e2d6699`）
- 整体样式优化（`56a9c77`）

### 修复

- 修正部署配置（`864680b`）

### 文档

- 增加 README（`6ce2e94`）

## [0.1.0] - 2026-03-18

### 新增

- 项目初始化：Vue 3 + Vite 脚手架（`e715d5e`）
