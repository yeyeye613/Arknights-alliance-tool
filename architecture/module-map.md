# 模块职责与入口

路径均相对 `frontend/src`。依赖方向只允许自上而下：

```text
app → features → entities / shared / infrastructure → data
```

P4 之后代码按「功能」而非「文件类型」组织：一个功能需要的组件、composable、领域规则、测试都在同一个 `features/<name>/` 下。P5 起跨 feature 只能从各自的 `index.ts` 导入。

## 目录总览

```text
src/
├─ app/                             组合根：App.vue、入口 main.ts、全局样式、模态状态
├─ features/
│  ├─ game-version/                 版本切换与版本上下文（所有 feature 都依赖它）
│  ├─ roster/                       干员池：筛选、干员卡、自选干员、特质浮层
│  ├─ formation/                    当前编队：人数上限、槽位、生效效果
│  ├─ covenants/                    盟约统计、盟约栏、盟约浮层
│  ├─ equipment/                    装备池、临时装备池、装备选择器、装备规则
│  ├─ library/                      已保存编队与合集
│  └─ sharing/                      分享码编解码、导入导出
├─ entities/                        实体类型与数据访问器（干员 / 盟约 / 装备 / 编队 / 版本）
├─ shared/                          BaseModal、通用浮层控制器、图片地址
├─ infrastructure/
│  ├─ storage/                      键常量、读写器、编队仓储、偏好仓储
│  └─ pwa/                          Service Worker 注册与更新提示
├─ data/                            版本注册表 + 数据集 + 装备数据访问
├─ assets/                          图片资源
└─ tests/                           跨 feature 集成测试（冒烟 / 分享码兼容 / 存档兼容 / 分层护栏）
```

| 目录 | 文件数 | 说明 |
| --- | --- | --- |
| `app` | 7 | `App.vue`、`main.ts`、全局样式、`useTeamDialog`、`useToast` + 2 测试 |
| `features/game-version` | 4 | 组件 + composable + `index.ts` + 1 测试 |
| `features/roster` | 16 | 6 组件 + 1 样式 + 3 composable + 1 domain + `index.ts` + 4 测试 |
| `features/formation` | 9 | 4 组件 + 1 composable + 1 domain + `index.ts` + 2 测试 |
| `features/covenants` | 9 | 2 组件 + 2 composable + 1 domain + `index.ts` + 3 测试 |
| `features/equipment` | 9 | 3 组件 + 1 composable + 1 domain + `index.ts` + 3 测试 |
| `features/library` | 8 | 3 组件 + 1 composable + `index.ts` + 3 测试 |
| `features/sharing` | 9 | 2 组件 + 2 composable + 2 domain + `index.ts` + 2 测试 |
| `entities` | 5 | `covenant` `operator` `equipment` `team` `version` |
| `shared` | 4 | `BaseModal` `PwaUpdatePrompt` `useTooltip` `assets` |
| `infrastructure` | 5 | 4 个存储模块 + PWA |
| `data` | 10 | 注册表 + 8 份数据集 + 装备数据访问 |

---

## 跨 feature 依赖

每个 feature 的 `index.ts` 是对外唯一入口，`src/tests/featureBoundaries.spec.js` 扫源码强制执行：跨 feature 与 `app/` 只能 `import ... from "@/features/<name>"`。

| 被依赖方 | 公开符号 | 谁在用 |
| --- | --- | --- |
| game-version | `useGameVersion` `VersionSwitch` | 其余全部 feature、`app/App.vue` |
| equipment | `EquipmentPool` `EquipmentStaging` `EquipmentPicker` `hasEquipmentDrag` `readEquipmentDrag` + `equipRules` 六个跨 feature 函数 | formation、covenants（仅 domain）、`App.vue` |
| covenants | `CovenantsPanel` `CovenantTooltip` `useCovenantStats` `show/move/hideCovenantTooltip` `isCoarsePointer` | roster、formation、`App.vue` |
| roster | `PoolPanel` `OperatorCard` `TraitTooltip` `show/move/hideTraitTooltip` | formation、`App.vue` |
| formation | `TeamPanel` `useTeamManagement` `resolveTeamVersionId` | library、`App.vue` |
| library | `SavedTeamsPanel` `SaveTeamDialog` `useTeamStorage` | `App.vue` |
| sharing | `ShareDialog` `ImportDialog` `useShareCode` `useShareDialogs` | `App.vue` |

依赖方向是一条无环链：

```text
game-version → equipment → covenants → roster → formation → library
```

唯一的深引例外是 `domain/` 之间：`covenants/domain` 直接 import `equipment/domain/equipRules`。纯规则依赖纯规则不该经过一个 re-export 了 Vue 组件的桶，否则领域层的依赖图里会凭空出现组件。护栏测试对这条例外有专门断言。

--- | --- | --- |
| `game-version/composables/useGameVersion.js` | 除 sharing 外全部 feature | 版本上下文，本质是 app 级单例 |
| `equipment/domain/equipRules.ts` | formation、covenants、`data/versions.js` | 纯函数，无反向依赖 |
| `roster/components/OperatorCard.vue` | formation 的 `OperatorSlot` | 唯一的干员卡实现，抽开就会分叉 |
| `covenants/` 的统计与浮层 | roster 的 `PoolPanel` / `PoolFilters` | 干员卡悬停要看盟约效果 |

这些都是**有向无环**的（`formation → roster → covenants → equipment → data`），没有互相引用。P5 收口时优先把 `equipRules` 与 `useGameVersion` 提升为共享模块，`OperatorCard` 留在 roster 并在 `roster/index.ts` 导出。

---

## app 层

| 模块 | 职责 | 关键入口 |
| --- | --- | --- |
| `app/App.vue` | 唯一持有跨面板状态的地方：当前标签页、临时装备池、编队上限；实例化 `useGameVersion` / `useTeamManagement` / `useTeamStorage` / `useShareCode` / `useTeamDialog` / `useShareDialogs` / `useToast`；把 composable 的返回值包成组件可用的回调（`saveTeamWrapper` 等）；处理版本切换联动（切到无装备版本时清空临时装备池并退回干员池） | `<script setup>` 内的 `TABS`、`handleAddToTeam`、`importFromCodeWrapper` |
| `app/main.ts` | `createApp(App).mount('#app')`，随后 `initServiceWorker()` | 副作用入口 |
| `app/useTeamDialog.js` | 保存 / 编辑编队弹窗：开窗、编辑态 `{ collectionName, teamIndex }`；队名与合集选择由 `SaveTeamDialog` 自持 | `showTeamModal` `editingTeam` `editingLocation` `openSaveTeamModal` `closeTeamModal` `editTeam` |
| `app/useToast.js` | 顶部临时提示：连续触发时先清旧计时器，effect scope 销毁时释放 | `tempMessage` `showTempMessage` |
| `app/styles/base.css` | 全局变量与基础样式 | — |

> 新增跨面板状态时，先判断它属于「会话级」还是「持久级」，再决定放 `App.vue` 还是新开 composable。不要往子组件里塞共享状态。

---

## features

### game-version

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `components/VersionSwitch.vue` | 版本切换按钮组，成功后 emit `change` 用于弹提示 | `useGameVersion` |
| `composables/useGameVersion.js` | **模块级单例**版本状态：读缓存、校验、切换、派生当前版本的盟约 / 干员 / 核心 / 附加分组 | `preferencesRepository`、`data/versions.js` |

导出：`versions` `currentVersionId` `currentVersion` `covenants` `operators` `coreCovenants` `additionalCovenants` `setVersion`。

### roster（干员池）

| 模块 | 职责 | Props / Emits | 依赖 |
| --- | --- | --- | --- |
| `components/PoolPanel.vue` | 干员池布局：折叠条、拖拽网格、空态、自选干员弹窗 | emits: `addToTeam` | `useGameVersion`、`usePoolFilters`、`useSelfOperators`、`useTraitTooltip`、`useCovenantTooltip`、`PoolFilters`、`OperatorCard`、`SelfOperatorDialog` |
| `components/PoolFilters.vue` | 筛选面板：搜索、折叠、视图切换、阶数、两行盟约、特质、已选摘要 | props: `filters` `banned` `core/additionalCovenants` `traitType/TriggerOptions` `activeFilters` `collapsed` `viewMode`；emits: `set-filter` `toggle-cov` `update:collapsed` `update:viewMode` `clear-filter` `clear-all` `add-self-operator` `hover*` | 状态在 `usePoolFilters`，这里只渲染 |
| `components/CovenantFilterRow.vue` | 一行盟约按钮（图标 / 文字两形态），`.chip` / `.cov-icon` 类名与层级不变 | props: `label` `names` `selected` `banned` `viewMode` `hint`；emits: `toggle` `hover` `hover-move` `hover-leave` | 三态判定不在组件内 |
| `components/OperatorCard.vue` | 干员卡片的**唯一定义**（宽 75px）：头像兜底、名字、阶数角标、自选标、`op-missing` / `drop-ready` / `drag-over` 状态样式 | props: `op` `tier` `pickOn`(`root`/`image`/`none`) `missing` `dropReady` `dragOver`；emits: `pick`；默认插槽给编队塞删除按钮与装备角标 | 不认识队伍、装备与浮层 |
| `components/SelfOperatorDialog.vue` | 自选（甄选）干员：从 `data/selfOperators.json` 选人，五阶 / 六阶各限 2 名（原 `AddOpPanel`） | props: `show` `selectedOperators`；emits: `close` `confirm` | `useGameVersion`、`BaseModal` |
| `components/TraitTooltip.vue` | 干员特质浮层 | `teleport` 到 `body` 避免被 `overflow: auto` 裁剪；内容来自 `useTraitTooltip` 单例 | `useTraitTooltip` |
| `components/filter-controls.css` | 筛选控件共享样式（两个组件用 `<style scoped src>` 引入） | — | — |
| `composables/usePoolFilters.js` | 6 个筛选维度 + Ban 列表 + 折叠 / 视图偏好 + 已选摘要 + 切版本清理 | `preferencesRepository`、`domain/filterOperators` | `filters` `banned` `collapsed` `viewMode` `activeFilterList` `banState` `setFilter` `toggleCov` `clearAllFilters` |
| `composables/useSelfOperators.js` | 自选干员：读取时按 `selfOperators.json` + Ⅴ/Ⅵ 阶重算，变更落盘 | `preferencesRepository` | `selfOperators` |
| `composables/useTraitTooltip.js` | 特质浮层单例：用 `createTooltip` 实例化，只描述「特质浮层装什么」 | `shared/composables/useTooltip` | `showTraitTooltip` `moveTraitTooltip` `hideTraitTooltip` `useTraitTooltipState` |
| `domain/filterOperators.ts` | 六维筛选 + Ban 判定（faction / covenant 两套策略）+ 特质选项收集 | `entities/operator` `entities/version` | `filterOperators` `isBannedByCovenants` `resolveTier` `collectTraitOptions` `EMPTY_POOL_FILTER` |

### formation（当前编队）

| 模块 | 职责 | Props / Emits | 依赖 |
| --- | --- | --- | --- |
| `components/TeamPanel.vue` | 当前编队布局与**装配编排**：装备三条入口（拖放 / 点选 / 选择器）、卸下、上限截断、悬停提示 | props: `team` `teamLimit` `dropHint` `selectedEquipment`；emits: `update:team` `update:teamLimit` `save-team` `clear-team` `remove-from-team` `notify` `equipment-equipped` | `useCovenantStats`、`equipRules`、`teamRules`、`useEquipmentDrag`、`TeamHeader`、`OperatorSlot`、`ActiveEffectsList`、`CovenantsPanel`、`EquipmentPicker` |
| `components/TeamHeader.vue` | 编队标题栏：人数、上限输入（钳制 1–20）、保存、清空 | props: `count` `limit`；emits: `update:limit` `limit-change` `save` `clear` | 截断已有编队仍在 `TeamPanel` |
| `components/OperatorSlot.vue` | 编队槽位：`OperatorCard` + 删除按钮 + 装备角标 + 拖放事件 | props: `op` `missing` `dropReady` `dragOver`；emits: `pick` `remove` `remove-equipment` `hover` `move` `leave` `dragover` `dragleave` `drop` | roster 的 `OperatorCard` |
| `components/ActiveEffectsList.vue` | 已激活效果折叠列表 | props: `activeCovList` | 只维护自己的展开态 |
| `composables/useTeamManagement.js` | 当前编队（会话级）：入队、移除、上限截断、清空、加载（`addToTeam` 满员返回 `false`） | `domain/teamRules` | `team` `addToTeam` `removeFromTeam` `handleLimitChange` `clearTeam` `loadTeam` |
| `domain/teamRules.ts` | 编队上限、截断、跨版本干员判定与计数、版本回退（缺省 = 盟约版） | `entities/operator` `entities/version`、`data/versions.js` | `canAddToTeam` `exceedsTeamLimit` `truncateToLimit` `isOperatorMissing` `countMissingOperators` `resolveTeamVersionId` |

### covenants

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `components/CovenantsPanel.vue` | 编队盟约栏：展示出现的盟约、人数、进阶等级、变形同构体加成，悬停出效果浮层 | `useGameVersion`、`useCovenantTooltip` |
| `components/CovenantTooltip.vue` | 盟约效果浮层：激活门槛、编队人数、进阶等级、变形同构体加成、全部效果 | `useCovenantTooltip` |
| `composables/useCovenantStats.js` | 盟约统计的响应式胶水：`computed` 包 `computeCovenantStats`（51 行） | `useGameVersion`、`domain/covenantStats` |
| `composables/useCovenantTooltip.js` | 盟约浮层单例，额外带编队人数 / 进阶 / 变形同构体 | `shared/useTooltip` |
| `domain/covenantStats.ts` | 盟约人数统计（单次遍历算原始人数与装备贡献）、调和加成、激活列表、进阶阈值与等级、激活优先排序 | `equipRules`、`entities/covenant` `entities/operator` `entities/version` |

### equipment

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `components/EquipmentPool.vue` | 装备池标签页：按等阶与关键词筛选 70 件装备，点击放入临时装备池，可拖拽 | `data/equipment.js`、`useEquipmentDrag` |
| `components/EquipmentStaging.vue` | 临时装备池：暂存待分配装备、选中态、拖拽载荷标记来源为 `staging` | `useEquipmentDrag` |
| `components/EquipmentPicker.vue` | 干员装备选择弹窗：两个槽位、组合装与变形同构体提示 | `data/equipment.js`、`domain/equipRules` |
| `composables/useEquipmentDrag.js` | 装备拖拽载荷：自定义 MIME `application/x-arknights-equipment`，与干员排序拖拽区分 | — |
| `domain/equipRules.ts` | 装备槽位、变形同构体授予盟约、组合装识别、装配校验与卸下、是否有装备池 | `entities/equipment` `entities/operator` `entities/version` |

### library（已保存编队）

| 模块 | 职责 | Props / Emits | 依赖 |
| --- | --- | --- | --- |
| `components/SavedTeamsPanel.vue` | 已保存编队与合集：按当前版本过滤视图、合集与未归类两组、加载 / 分享 / 编辑 / 移动 / 删除入口；**询问目标合集名与合集展开态都在这里** | props: `savedTeams` `teamCollections` `currentVersionId`；emits: `loadTeam` `shareTeam` `shareCollection` `editTeam` `moveToCollection`（载荷 `{ teamItem, fromCollectionName, savedIndex, targetCollectionName }`）`deleteTeam` `toggleCollection` `showImportModal` | `teamRules`、`data/versions.js`、`TeamCard` |
| `components/TeamCard.vue` | 已保存编队的一条记录：名字 + 前 9 个头像 + 操作按钮 | props: `team` `editMode`；emits: `load` `share` `edit` `move` `remove` | 合集内与「未归类」两处共用 |
| `components/SaveTeamDialog.vue` | 保存 / 编辑编队：名称输入、选择合集（下拉值是**合集名**）、自动聚焦（原 `SaveTeamModal`） | props: `show` `currentTeam` `teamCollections` `isEdit` `editTeamData`；emits: `close` `save` `update` | `BaseModal` |
| `composables/useSavedTeams.js` | 编队与合集的**内存状态与编排**：初始化、保存、更新、删除、移动到合集；合集为空时自动回收。持久化在 `teamsRepository`；合集引用一律用名字（原 `useTeamStorage`） | `teamsRepository`、`teamRules` | `savedTeams` `teamCollections` `initSavedTeams` `saveTeam` `updateTeam` `deleteTeamOp` `moveToCollectionOp` |

### sharing

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `components/ShareDialog.vue` | 展示分享码：只读输入框自动全选、复制、编队 / 合集预览、装备数量提示（原 `ShareModal`） | `BaseModal` |
| `components/ImportDialog.vue` | 导入分享码：粘贴即解析、错误信息、解析后预览、确认导入（原 `ImportModal`） | `BaseModal`、`useShareCode` |
| `composables/useShareCode.js` | 分享码门面：生成码 + 导入编排；解析与映射委托 `domain/shareImport`（95 行） | `domain/shareCodec`、`domain/shareImport` |
| `composables/useShareDialogs.js` | 分享 / 导入弹窗：共用「当前预览是编队还是合集」的状态；空码时用注入的 `notify` 提示 | — |
| `domain/shareCodec.ts` | v3 二进制协议：varint / Base62 / 码表引用 / 条件压缩 / 编队与合集两类载荷（`type=3` 全量导出已删）。P5 只加类型，位运算与阈值一个表达式未动 | `pako` |
| `domain/shareImport.ts` | 分享码解析（v3 紧凑码 + v1/v2 历史前缀）与载荷 → 编队/合集映射，不落库 | `shareCodec`、`entities/*`、`data/versions.js` |

---

## shared（跨 feature 复用）

| 模块 | 职责 | 主要导出 |
| --- | --- | --- |
| `components/BaseModal.vue` | 弹窗骨架：遮罩、标题、关闭、`contentClass` 透传、点遮罩关闭可关 | props: `show` `title` `contentClass` `closeOnOverlay` |
| `components/PwaUpdatePrompt.vue` | 新版本提示条 | 读 `updateAvailable`，调 `applyUpdate` / `dismissUpdate` |
| `composables/useTooltip.js` | 悬停浮层的公共实现：定位、贴边收拢、触屏 2.6 秒自动消失、`isCoarsePointer` | `createTooltip` `isCoarsePointer` `TOUCH_HIDE_DELAY` |
| `lib/assets.js` | 图片地址拼装（`import.meta.env.BASE_URL` + 中文命名约定）与加载失败占位 | `getAvatarUrl` `getIconUrl` `getEquipmentIconUrl` `handleImgError` |

---

## entities（实体类型与数据访问器）

| 模块 | 职责 | 主要导出 |
| --- | --- | --- |
| `version.ts` | 版本形状与 Ban 策略；`getGameVersion` 给 data 的 JS 实现补签名 | `GameVersion` `GameVersionLike` `BanStrategy` `getGameVersion` |
| `covenant.ts` | 盟约与效果类型、分组解析 | `Covenant` `getCovenantsByGroup` |
| `operator.ts` | 干员静态数据与编队实例类型、版本相对的解析（含自选干员） | `OperatorBase` `OperatorInstance` `TeamEntry` `Trait` `getOperatorCovenants` `getEffectiveOperatorCovenants` `getOperatorTier` `getOperatorTraits` `findOperatorEverywhere` `isSelfOperatorRegistered` |
| `equipment.ts` | 装备条目类型 | `Equipment` |
| `team.ts` | 已保存编队与合集类型 | `SavedTeam` `TeamCollection` |

边界：依赖方向只有 `entities → data`（访问器要读数据集），`data` 不反向 import。它**不属于领域层**——`domainBoundaries` 按目录名 `domain` 扫描，entities 不在其中，允许读数据。

---

## infrastructure

### storage

| 模块 | 职责 | 主要导出 | 行数 |
| --- | --- | --- | --- |
| `keys.ts` | 6 个键名常量，**值冻结**（改名 = 老用户存档全丢）；键名字面量只允许出现在这里 | `STORAGE_KEYS` | 24 |
| `localStore.ts` | `readJSON` / `writeJSON` / `readText` / `writeText`：统一 try/catch，解析失败回退、写入失败只告警 | 同名 4 个函数 | 77 |
| `teamsRepository.ts` | 编队与合集存取：读回补 `expanded: true`，落库剥离 `expanded`；损坏存档回退空数组 | `loadTeams` `loadCollections` `saveTeams` `saveCollections` `toPersistedCollection` `PersistedCollection` | 53 |
| `preferencesRepository.ts` | 四类偏好：版本 id、筛选视图、筛选折叠、自选干员；把 `"1"/"0"`、`icon/text` 这类编码收在一处 | `getVersionId` `setVersionId` `getFilterView` `setFilterView` `getFilterCollapsed` `setFilterCollapsed` `getSelfOperators` `setSelfOperators` `FilterView` | 55 |

边界：只被 `composables` 调用，自身不 import `composables` / `components`；不判断数据合法性（那是 composable 的事）。

存档兼容性由 `src/tests/storageCompat.spec.js` 锁住：用例里用真实旧存档 JSON 与键名字面量，不引用 `STORAGE_KEYS`——引用常量就测不出改名。

### pwa

| 模块 | 职责 | 主要导出 |
| --- | --- | --- |
| `usePwaUpdate.ts` | Service Worker 注册（仅生产）、新版本状态、立即更新 / 忽略 | `updateAvailable` `initServiceWorker` `applyUpdate` `dismissUpdate` |

---

## 数据层

| 模块 | 职责 | 主要导出 |
| --- | --- | --- |
| `versions.js` | 版本注册表与干员解析：版本元信息、默认版本、分组过滤、盟约解析（含自选干员策略与装备加成）、阶数 / 特质解析、跨版本查找。**开 `@ts-check`**，注册表字段写错会在类型检查阶段报错 | `GAME_VERSIONS` `DEFAULT_VERSION_ID` `CORE_GROUP` `ADDITIONAL_GROUP` `getGameVersion` `isValidVersionId` `getCovenantsByGroup` `getOperatorCovenants` `getEffectiveOperatorCovenants` `getOperatorTier` `getOperatorTraits` `findOperatorEverywhere` |
| `equipment.js` | 只做装备**数据访问**：池访问、排序列表；规则已全部在 `features/equipment/domain/equipRules.ts`，本文件不再 re-export | `TIER_LABELS` `getEquipmentList` |
| `covenants.mengyue.json` | 盟约版盟约数据：23 个（核心 8 / 附加 15） | 默认导出对象，键为盟约名 |
| `operators.mengyue.json` | 盟约版干员：113 名 | 同上，键为干员名 |
| `covenants.guicheng.json` | 规程版盟约：26 个（核心 10 / 附加 16） | — |
| `operators.guicheng.json` | 规程版干员：143 名（与盟约版重叠 67 名） | — |
| `equipment.guicheng.json` | 规程版装备：70 件，其中 19 件带 `morph`、5 件带 `parts` | — |
| `selfOperators.json` | 自选干员配置：27 条，含阶数、盟约、特质 | — |
| `opCodebook.json` | 干员码表：200 条，覆盖两版本 + 自选的全部名字 | 数组，下标即码值 |
| `equipCodebook.json` | 装备码表：70 条 | 同上 |

数据结构与字段语义见 [data-model.md](data-model.md)。

---

## 状态归属速查

| 状态 | 归属 | 生命周期 |
| --- | --- | --- |
| 当前版本 id | `useGameVersion`（模块级单例） | 跨组件、跨刷新 |
| 当前编队 | `app/App.vue` ← `useTeamManagement` | 会话，刷新即丢（未保存时） |
| 已保存编队 / 合集 | `useSavedTeams`（落库经 `teamsRepository`） | 跨刷新 |
| 临时装备池、选中装备 | `app/App.vue` 局部 `ref` | 会话 |
| 弹窗开关 | `app/useTeamDialog` / `features/sharing/useShareDialogs` | 会话 |
| 顶部提示 | `app/useToast` | 会话（2 秒） |
| 浮层坐标与内容 | `useTraitTooltip` / `useCovenantTooltip`（共用 `shared/useTooltip`） | 会话 |
| 筛选条件、折叠偏好 | `usePoolFilters`（+ `preferencesRepository`） | 跨刷新 |
| 自选干员 | `useSelfOperators`（+ `preferencesRepository`） | 跨刷新 |

---

## 脚本与测试

| 路径 | 作用 |
| --- | --- |
| `scripts/gen-codebook.mjs` | 扫 `operators.mengyue.json` / `operators.guicheng.json` / `selfOperators.json` / `equipment.guicheng.json`，**仅在末尾追加**新名字到码表，输出追加明细 |
| `src/tests/app.smoke.spec.js` | 整体渲染与版本切换冒烟 |
| `src/tests/shareCompat.spec.js` | v3 四条快照 + v1/v2 历史码 + 非法输入 |
| `src/tests/storageCompat.spec.js` | 旧存档逐字读回、`expanded` 重置与剥离、键名不变、损坏回退 |
| `src/tests/domainBoundaries.spec.js` | 递归扫描 `src/**/domain/*.ts`，断言不碰 Vue / 存储 / 对话框 / 视图层 |
| `src/tests/featureBoundaries.spec.js` | 断言跨 feature 与 `app/` 只从 `features/<name>/index.ts` 导入 |
| `features/*/tests/*` | 各功能自己的规则与组件测试（18 个文件；加上 `app/tests/` 的 2 个共 20 个） |
| `scripts/` 之外 | `npm run knip` 检查未使用的文件 / 导出 / 依赖，当前 0 输出 |

`src/tests/` 只留跨 feature 的集成与护栏；功能内部的测试跟着功能走，改一个 feature 不需要在 `src/tests/` 里翻文件。
