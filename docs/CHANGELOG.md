# 变更记录

本项目的所有重要变更都记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 说明：仓库尚未创建 git tag。下面的版本号按**里程碑提交区间**划分，日期为区间内最后一次提交的日期；版本号与 `frontend/package.json` 的 `version` 字段（当前仍是脚手架默认的 `0.0.0`）暂未同步。

## [Unreleased]

### 重构

架构审计后的 P0 / P1 两步（详见 [docs/architecture/refactoring-plan.md](architecture/refactoring-plan.md)），产品行为不变：

- **新增 `src/domain/` 领域层**：`covenantStats`（盟约统计）、`filterOperators`（筛选与 Ban）、`teamRules`（上限、跨版本判定、版本回退）、`equipRules`（槽位、变形同构体、组合装、装配校验）、`shareImport`（分享码解析与导入映射）全部改为无 Vue 依赖的纯函数，`src/domain/*.ts` 附带类型定义
- `useCovenantStats` 只保留响应式胶水；`versionSource` 参数可选，不传时才回退到全局当前版本
- `useShareCode().importFromCode` 由 8 个位置参数改为 `(data, { versionId, addTeam, addCollection, notify, close })`，不再直接 push 调用方的 `savedTeams` / `teamCollections`
- `useShareCode().shareTeam / shareCollection` 移除，分享弹窗状态改由 `App.vue` 组装
- `useTeamStorage().saveTeam / updateTeam` 去掉未使用的 `team` 参数（改从 `teamData.team` 取值）
- 盟约统计合并为单次遍历（原先同一编队扫两遍、每名干员的盟约解析重复计算）
- `data/equipment.js` 只保留数据访问，规则部分 re-export 自 `domain/equipRules`（过渡用，P4 删除）

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

### 移除

- 全量导出（`generateFullCode` / `encodeFull` / `ARKFULL` 前缀 / v3 `type=3` 解码分支）：从未上线 UI，也无历史码
- `App.vue` 中 4 个未使用的 composable 解构（`createTeamFromData`、`createCollectionFromData` 等）

### 测试

- 新增 `src/domain` 纯函数测试 80 条：`domain.covenantStats`（23）、`domain.filterOperators`（25）、`domain.teamRules`（10）、`domain.equipRules`（22）
- 新增 `domainBoundaries.spec.js`（4 条）：读源码校验 `domain/` 不依赖 Vue、不碰 `localStorage` / `alert` / DOM、不反向依赖组件
- 新增 `shareCompat.spec.js`（14 条）：锁定 4 条 v3 分享码快照、覆盖 v1/v2 历史码解析、`ARKCOL` 合集分支、未知干员跳过、非法输入
- 修复 `mobilePool.spec.js` 的假绿：`matchMedia` 桩原先把查询串写死为 `768px` 且忽略入参，与实现的 `1024px` 不符却永远通过；现在只在查询串匹配时返回结果，并直接断言组件查询的断点
- 干员总数 / 装备数 / 变形同构体数等规模断言改为从数据推导，赛季更新不再假红
- 总数 87 → 186

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
