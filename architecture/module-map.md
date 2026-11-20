# 模块职责与入口

路径均相对 `frontend/`。每个模块只列「它负责什么」与「谁在用它」，依赖方向必须自上而下：`components → composables → domain → data / utils`。

## 目录总览

```text
src/
├─ App.vue                      组合根：实例化全部 composable，串联三块面板与弹窗
├─ main.ts                      挂载应用 + 生产环境注册 Service Worker
├─ style.css                    全局变量与基础样式
├─ components/                  23 个组件 + 1 份共享筛选样式（面板 7 / 子视图 6 / 弹窗 6 / 浮层 2 / 其它 2）
├─ composables/                 13 个组合式函数（状态、持久化、浮层、响应式胶水、PWA）
├─ domain/                      7 个纯函数模块 + 类型定义（无 Vue、无 DOM）
├─ infrastructure/storage/      4 个持久化模块：键常量、读写器、编队仓储、偏好仓储
├─ data/                        版本注册表 + 10 份数据集 + 装备数据访问
├─ utils/                       分享码编解码、图片地址
└─ tests/                       22 个 Vitest 测试文件
```

---

## 组合根

| 模块 | 职责 | 关键入口 |
| --- | --- | --- |
| `App.vue` | 唯一持有跨面板状态的地方：当前标签页、临时装备池、编队上限；实例化 `useGameVersion` / `useTeamManagement` / `useTeamStorage` / `useShareCode` / `useModalState`；把 composable 的返回值包成组件可用的回调（`saveTeamWrapper` 等）；处理版本切换联动（切到无装备版本时清空临时装备池并退回干员池） | `<script setup>` 内的 `TABS`、`loadTeam`、`importFromCodeWrapper` |
| `main.ts` | `createApp(App).mount('#app')`，随后 `initServiceWorker()` | 默认导出无，副作用入口 |

> 新增跨面板状态时，先判断它属于「会话级」还是「持久级」，再决定放 `App.vue` 还是新开 composable。不要往子组件里塞共享状态。

---

## 视图层

### 面板（布局层）

> P2 之后，面板只负责「摆位置 + 接线」，具体区块在下方「子视图」里。

| 组件 | 职责 | Props / Emits | 依赖 |
| --- | --- | --- | --- |
| `PoolPanel.vue` | 干员池布局：折叠条、拖拽网格、空态、自选干员弹窗；组合 `PoolFilters` 与 `OperatorCard` | emits: `addToTeam` | `useGameVersion`、`usePoolFilters`、`useSelfOperators`、`useTraitTooltip`、`useCovenantTooltip`、`PoolFilters`、`OperatorCard`、`AddOpPanel`、`vue-draggable-plus` |
| `TeamPanel.vue` | 当前编队布局与**装配编排**：装备三条入口（拖放 / 点选 / 选择器）、卸下、上限截断、悬停提示；Sortable 容器与 `slot name="staging"` | props: `team` `teamLimit` `dropHint` `selectedEquipment`；emits: `update:team` `update:teamLimit` `save-team` `clear-team` `remove-from-team` `notify` `equipment-equipped` | `useCovenantStats`、`domain/equipRules`、`domain/teamRules`、`useEquipmentDrag`、`TeamHeader`、`OperatorSlot`、`ActiveEffectsList`、`CovenantsPanel`、`EquipmentPicker` |
| `SavedTeamsPanel.vue` | 已保存编队与合集：按当前版本过滤视图、合集与未归类两组、加载 / 分享 / 编辑 / 移动 / 删除入口；**询问目标合集名与合集展开态都在这里**（`prompt` 与 `toggleCollection` 不上移到 composable） | props: `savedTeams` `teamCollections` `currentVersionId`；emits: `loadTeam` `shareTeam` `shareCollection` `editTeam` `moveToCollection`（载荷 `{ teamItem, fromCollectionName, savedIndex, targetCollectionName }`）`deleteTeam` `toggleCollection` `showImportModal` | `domain/teamRules`、`data/versions.js`（`DEFAULT_VERSION_ID`）、`TeamCard` |
| `CovenantsPanel.vue` | 编队盟约栏：展示出现的盟约、人数、进阶等级、变形同构体加成，悬停出效果浮层 | props: `presentCovList` `presentCovCounts` `advancedCovLevels` `morphCovCounts` | `useGameVersion`、`useCovenantTooltip` |
| `EquipmentPool.vue` | 装备池标签页：按等阶与关键词筛选 70 件装备，点击放入临时装备池，可拖拽 | props: `staged`；emits: `stage` | `data/equipment.js`、`useEquipmentDrag` |
| `EquipmentStaging.vue` | 临时装备池：暂存待分配装备、选中态、拖拽载荷标记来源为 `staging` | props: `items` `selected`；emits: `select` `remove` `clear` | `useEquipmentDrag` |

### 子视图（P2 拆出的组合块）

| 组件 | 职责 | Props / Emits | 说明 |
| --- | --- | --- | --- |
| `PoolFilters.vue` | 筛选面板：搜索、折叠、视图切换、阶数、两行盟约、特质、已选摘要 | props: `filters` `banned` `core/additionalCovenants` `traitType/TriggerOptions` `activeFilters` `collapsed` `viewMode`；emits: `set-filter` `toggle-cov` `update:collapsed` `update:viewMode` `clear-filter` `clear-all` `add-self-operator` `hover*` | 状态在 `usePoolFilters`，这里只渲染 |
| `CovenantFilterRow.vue` | 一行盟约按钮（图标 / 文字两形态），`.chip` / `.cov-icon` 类名与层级不变 | props: `label` `names` `selected` `banned` `viewMode` `hint`；emits: `toggle` `hover` `hover-move` `hover-leave` | 三态判定不在组件内：要看 `selected` + `banned` 才能决定下一步 |
| `OperatorCard.vue` | 干员卡片的**唯一定义**（宽 75px）：头像兜底、名字、阶数角标、自选标、`op-missing` / `drop-ready` / `drag-over` 状态样式 | props: `op` `tier` `pickOn`(`root`/`image`/`none`) `missing` `dropReady` `dragOver`；emits: `pick`；默认插槽给编队塞删除按钮与装备角标 | 不认识队伍、装备与浮层；悬停/拖拽事件由父级透传到根元素 |
| `TeamHeader.vue` | 编队标题栏：人数、上限输入（钳制 1–20）、保存、清空 | props: `count` `limit`；emits: `update:limit` `limit-change` `save` `clear` | 截断已有编队仍在 `TeamPanel`（需要读写 team） |
| `OperatorSlot.vue` | 编队槽位：`OperatorCard` + 删除按钮 + 装备角标 + 拖放事件 | props: `op` `missing` `dropReady` `dragOver`；emits: `pick` `remove` `remove-equipment` `hover` `move` `leave` `dragover` `dragleave` `drop` | 不认识 `equipToOperator`，也不认识 `props.team` |
| `ActiveEffectsList.vue` | 已激活效果折叠列表 | props: `activeCovList` | 只维护自己的展开态 |
| `TeamCard.vue` | 已保存编队的一条记录：名字 + 前 9 个头像 + 操作按钮 | props: `team` `editMode`；emits: `load` `share` `edit` `move` `remove` | 合集内与「未归类」两处共用；原始索引由父级在事件里绑定 |

> `components/filter-controls.css` 不是组件，是 `PoolFilters` 与 `CovenantFilterRow` 共享的 `.chip` / `.chip-list` / `.icon-filter-row` / `.row-label` 定义，两边用 `<style scoped src>` 引入，避免同一套筛选外观写两份后数值漂移。


### 弹窗

| 组件 | 职责 | Props / Emits |
| --- | --- | --- |
| `BaseModal.vue` | 弹窗骨架：遮罩、标题、关闭、`contentClass` 透传、点遮罩关闭可关 | props: `show` `title` `contentClass` `closeOnOverlay`；emits: `close` |
| `SaveTeamModal.vue` | 保存 / 编辑编队：名称输入、选择合集（下拉值用**合集名**，不用下标）、自动聚焦 | props: `show` `currentTeam` `teamCollections` `isEdit` `editTeamData`；emits: `close` `save` `update` |
| `ShareModal.vue` | 展示分享码：只读输入框自动全选、复制、编队 / 合集预览、装备数量提示 | props: `show` `title` `shareCode` `shareType` `previewData`；emits: `close` |
| `ImportModal.vue` | 导入分享码：粘贴即解析、错误信息、解析后预览、确认导入 | props: `show`；emits: `close` `import` |
| `AddOpPanel.vue` | 自选（甄选）干员：从 `selfOp.json` 选人，五阶 / 六阶各限 2 名 | props: `show` `selectedOperators`；emits: `close` `confirm` |

### 浮层与提示

| 组件 | 职责 | 关键点 |
| --- | --- | --- |
| `TraitTooltip.vue` | 干员特质浮层 | `teleport` 到 `body` 避免被 `overflow: auto` 裁剪；内容来自 `useTraitTooltip` 单例；`<战斗中>` 之类条件标记渲染成行内标签 |
| `CovenantTooltip.vue` | 盟约效果浮层：激活门槛、编队人数、进阶等级、变形同构体加成、全部效果 | 同上，内容来自 `useCovenantTooltip` 单例 |
| `PwaUpdatePrompt.vue` | 新版本提示条 | 读 `updateAvailable`，调 `applyUpdate` / `dismissUpdate` |
| `VersionSwitch.vue` | 版本切换按钮组 | 调 `useGameVersion().setVersion`，成功后 emit `change` 用于弹提示 |

---

## 领域层（domain，纯函数）

`src/domain/*.ts` 放「怎么算」，不放「什么时候算」。不 `import vue`、不读写 `localStorage`、不调 `alert`、不碰 DOM——这条由 `src/tests/domainBoundaries.spec.js` 读源码校验。

| 模块 | 职责 | 主要导出 | 谁在用 |
| --- | --- | --- | --- |
| `covenantStats.ts` | 盟约人数统计（单次遍历同时算原始人数与装备贡献）、调和加成、激活列表、进阶阈值与等级、激活优先排序 | `computeCovenantStats` `countBaseCovenants` `countMorphCovenants` `applyHarmonyBonus` `getActivatedCovList` `getAdvancedThresholds` `getAdvancedCovLevels` `getSortedCovenants` | `useCovenantStats` |
| `filterOperators.ts` | 六维筛选（名字 / 阶数 / 核心盟约 / 附加盟约 / 特质类型 / 触发时机）+ Ban 判定（faction / covenant 两套策略）+ 特质选项收集 | `filterOperators` `isBannedByCovenants` `resolveTier` `collectTraitOptions` `EMPTY_POOL_FILTER` | `usePoolFilters` |
| `teamRules.ts` | 编队上限、截断、跨版本干员判定与计数、版本回退（缺省 = 盟约版） | `canAddToTeam` `exceedsTeamLimit` `truncateToLimit` `isOperatorMissing` `countMissingOperators` `resolveTeamVersionId` | `useTeamManagement`、`TeamPanel`、`SavedTeamsPanel`、`App.vue` |
| `equipRules.ts` | 装备槽位、变形同构体授予盟约、组合装识别、装配校验与卸下、是否有装备池 | `EQUIPMENT_SLOT_COUNT` `MORPH_EQUIPMENT` `getMorphCovenant` `getOperatorEquipmentNames` `equipToOperator` `removeOperatorEquipment` `getCombinedEquipments` `hasEquipmentPool` `shouldConsumeFromStaging` | `TeamPanel`、`EquipmentPicker`、`EquipmentPool`、`useCovenantStats`、`App.vue` |
| `shareImport.ts` | 分享码解析（v3 紧凑码 + v1/v2 历史前缀）与载荷 → 编队/合集映射，不落库 | `parseShareCode` `parseLegacyCode` `restoreOperators` `mapImportedTeam` `mapImportedCollection` | `useShareCode` |
| `versionAdapter.ts` | `data/versions.js` 的唯一适配层：补类型、隔离未来拆分 | `getGameVersion` `getCovenantsByGroup` `getOperatorCovenants` `getEffectiveOperatorCovenants` `getOperatorTier` `getOperatorTraits` `findOperatorEverywhere` `isSelfOperatorRegistered` | 其余 domain 模块 |
| `types.ts` | 核心实体类型（盟约、装备、干员实例、编队、合集、版本） | 纯类型 | domain 内部 |

> `data/equipment.js` 目前对 `equipRules` 做 re-export（过渡兼容），P4 目录迁移时删除，调用方直接指向 `domain`。

---

## 响应式层（composables）

| 模块 | 职责 | 存储 | 主要导出 |
| --- | --- | --- | --- |
| `useGameVersion.js` | **模块级单例**版本状态：读缓存、校验、切换、派生当前版本的盟约 / 干员 / 核心 / 附加分组 | `preferencesRepository`（版本 id） | `versions` `currentVersionId` `currentVersion` `covenants` `operators` `coreCovenants` `additionalCovenants` `setVersion` |
| `useTeamManagement.js` | 当前编队（会话级）：入队、移除、上限截断、清空、加载（规则来自 `teamRules`） | 无 | `team` `addToTeam` `removeFromTeam` `handleLimitChange` `clearTeam` `loadTeam` |
| `useTeamStorage.js` | 编队与合集的**内存状态与编排**：初始化、保存、更新、删除、移动到合集；合集为空时自动回收。持久化细节在 `teamsRepository`；合集引用一律用名字，不用下标 | `teamsRepository` | `savedTeams` `teamCollections` `initSavedTeams` `saveAllData` `saveCollections` `addOrUpdateTeam` `deleteTeam` `moveToCollection`，以及包了提示文案的 `saveTeam` / `updateTeam` / `deleteTeamOp` / `moveToCollectionOp` |
| `useShareCode.js` | 分享码门面：生成码 + 导入编排；解析与映射委托 `domain/shareImport` | 无（落库由调用方回调完成） | `generateTeamCode` `generateCollectionCode` `parseCode` `restoreOperators` `importTeam` `importCollection` `importFromCode` |
| `useCovenantStats.js` | 盟约统计的响应式胶水：`computed` 包 `computeCovenantStats` | 无 | `presentCovCounts` `presentCovList` `activeCovList` `advancedCovLevels` `morphCovCounts` `covenantsData` `coreCovenants` |
| `useModalState.js` | 弹窗开关、临时提示（2 秒自动消失）、编辑态记录（`{ collectionName, teamIndex }`）、分享预览数据 | 无 | `showTeamModal` `showShareModal` `showImportModal` `tempMessage` `openSaveTeamModal` `editTeam` `showTempMessage` 等 |
| `usePoolFilters.js` | 干员池筛选状态：6 个维度 + Ban 列表 + 折叠 / 视图偏好 + 已选摘要 + 切版本清理（匹配规则在 `domain/filterOperators`） | `preferencesRepository`（视图 / 折叠） | `filters` `banned` `collapsed` `viewMode` `traitTypeOptions` `traitTriggerOptions` `activeFilterList` `banState` `setFilter` `toggleCov` `clearFilter` `clearAllFilters` |
| `useSelfOperators.js` | 自选（甄选）干员：读取时按 `selfOp.json` + Ⅴ/Ⅵ 阶重算，变更落盘 | `preferencesRepository`（自选干员） | `selfOperators`；另导出 `normalizeSelfOperators` 供测试与导入复用 |
| `useTooltip.js` | 悬停浮层的公共实现：定位、贴边收拢、触屏 2.6 秒自动消失、`isCoarsePointer` | 无 | `createTooltip({ width, height, initialState })` `isCoarsePointer` `TOUCH_HIDE_DELAY` |
| `useTraitTooltip.js` | 特质浮层单例：用 `createTooltip` 实例化，只描述「特质浮层装什么」 | 无 | `showTraitTooltip` `moveTraitTooltip` `hideTraitTooltip` `useTraitTooltipState` |
| `useCovenantTooltip.js` | 盟约浮层单例：同上，额外带编队人数 / 进阶 / 变形同构体 | 无 | `showCovenantTooltip` `moveCovenantTooltip` `hideCovenantTooltip` `isCoarsePointer`（re-export） `useCovenantTooltipState` |
| `useEquipmentDrag.js` | 装备拖拽载荷：自定义 MIME `application/x-arknights-equipment`，与干员排序拖拽区分 | 无 | `EQUIPMENT_DRAG_TYPE` `hasEquipmentDrag` `readEquipmentDrag` |
| `usePwaUpdate.ts` | Service Worker 注册（仅生产）、新版本状态、立即更新 / 忽略 | 由 Workbox 管理 | `updateAvailable` `initServiceWorker` `applyUpdate` `dismissUpdate` |

### 状态归属速查

| 状态 | 归属 | 生命周期 |
| --- | --- | --- |
| 当前版本 id | `useGameVersion`（模块级单例） | 跨组件、跨刷新 |
| 当前编队 | `App.vue` ← `useTeamManagement` | 会话，刷新即丢（未保存时） |
| 已保存编队 / 合集 | `useTeamStorage`（落库经 `teamsRepository`） | 跨刷新 |
| 临时装备池、选中装备 | `App.vue` 局部 `ref` | 会话 |
| 弹窗开关、提示文案 | `useModalState` | 会话 |
| 浮层坐标与内容 | `useTraitTooltip` / `useCovenantTooltip`（共用 `useTooltip` 的控制器） | 会话 |
| 筛选条件、折叠偏好 | `usePoolFilters`（+ `preferencesRepository`） | 跨刷新 |
| 自选干员 | `useSelfOperators`（+ `preferencesRepository`） | 跨刷新 |

---

## 基础设施层（infrastructure/storage）

| 模块 | 职责 | 主要导出 | 行数 |
| --- | --- | --- | --- |
| `keys.ts` | 6 个键名常量，**值冻结**（改名 = 老用户存档全丢）；键名字面量只允许出现在这里 | `STORAGE_KEYS` `StorageKey` | 26 |
| `localStore.ts` | `readJSON` / `writeJSON` / `readText` / `writeText`：统一 try/catch，解析失败回退、写入失败只告警 | 同名 4 个函数 | 77 |
| `teamsRepository.ts` | 编队与合集存取：读回补 `expanded: true`，落库剥离 `expanded`；损坏存档回退空数组 | `loadTeams` `loadCollections` `saveTeams` `saveCollections` `toPersistedCollection` `PersistedCollection` | 53 |
| `preferencesRepository.ts` | 四类偏好：版本 id、筛选视图、筛选折叠、自选干员；把 `"1"/"0"`、`icon/text` 这类编码收在一处 | `getVersionId` `setVersionId` `getFilterView` `setFilterView` `getFilterCollapsed` `setFilterCollapsed` `getSelfOperators` `setSelfOperators` `FilterView` | 55 |

边界：只被 `composables` 调用，自身不 import `composables` / `components`；不判断数据合法性（那是 composable 的事）。

存档兼容性由 `src/tests/storageCompat.spec.js` 锁住：用例里用真实旧存档 JSON 与键名字面量，不引用 `STORAGE_KEYS`——引用常量就测不出改名。

---

## 数据层

| 模块 | 职责 | 主要导出 |
| --- | --- | --- |
| `versions.js` | 版本注册表与干员解析：版本元信息、默认版本、分组过滤、盟约解析（含自选干员策略与装备加成）、阶数 / 特质解析、跨版本查找 | `GAME_VERSIONS` `DEFAULT_VERSION_ID` `CORE_GROUP` `ADDITIONAL_GROUP` `getGameVersion` `isValidVersionId` `getCovenantsByGroup` `getOperatorCovenants` `getEffectiveOperatorCovenants` `getOperatorTier` `getOperatorTraits` `findOperatorEverywhere` `getOperatorVersionIds` |
| `equipment.js` | 装备规则：池访问、排序列表、槽位上限、装配校验、变形同构体判定、组合装备提示 | `EQUIPMENT_SLOT_COUNT`（2） `MORPH_EQUIPMENT` `TIER_LABELS` `getEquipments` `findEquipment` `getEquipmentList` `getOperatorEquipmentNames` `getMorphCovenant` `getCombinedEquipments` `hasEquipmentPool` `equipToOperator` `removeOperatorEquipment` |
| `covenants.json` | 盟约版盟约数据：23 个（核心 8 / 附加 15） | 默认导出对象，键为盟约名 |
| `operators.json` | 盟约版干员：113 名 | 同上，键为干员名 |
| `covenants.guicheng.json` | 规程版盟约：26 个（核心 10 / 附加 16） | — |
| `operators.guicheng.json` | 规程版干员：143 名（与盟约版重叠 67 名） | — |
| `equipment.guicheng.json` | 规程版装备：70 件，其中 19 件带 `morph`、5 件带 `parts` | — |
| `selfOp.json` | 自选干员配置：27 条，含阶数、盟约、特质 | — |
| `opCodebook.json` | 干员码表：200 条，覆盖两版本 + 自选的全部名字 | 数组，下标即码值 |
| `equipCodebook.json` | 装备码表：70 条 | 同上 |

数据结构与字段语义见 [data-model.md](data-model.md)。

---

## 工具层

| 模块 | 职责 | 主要导出 |
| --- | --- | --- |
| `shareCodec.js` | v3 二进制协议：varint / Base62 / 码表引用 / 条件压缩 / 编队与合集两类载荷编解码（`type=3` 全量导出已删） | `CODE_PREFIX` `encodeTeam` `encodeCollection` `isCompactCode` `decodeCompact` `getCodebook` |
| `index.js` | 图片地址拼装（`import.meta.env.BASE_URL` + 中文命名约定）与加载失败占位 | `getAvatarUrl` `getIconUrl` `getEquipmentIconUrl` `handleImgError` |

---

## 脚本与测试

| 路径 | 作用 |
| --- | --- |
| `scripts/gen-codebook.mjs` | 扫 `operators*.json` / `selfOp.json` / `equipment.guicheng.json`，**仅在末尾追加**新名字到码表，输出追加明细 |
| `src/tests/useShareCode.spec.js` | 编解码往返、版本标识、装备字段、旧码兼容 |
| `src/tests/useTeamStorage.spec.js` | 存储初始化、保存、移动、删除 |
| `src/tests/useCovenantStats.spec.js` | 层数统计、激活判定、进阶等级 |
| `src/tests/gameVersion.spec.js` | 两版本数据完整性、核心盟约数量、自选干员阵营映射、跨版本查找 |
| `src/tests/equipment.spec.js` | 装备池完整性、变形同构体、组合装、槽位上限 |
| `src/tests/equipmentUi.spec.js` | 装备选择器、角标、拖放、临时装备池、标签页可见性 |
| `src/tests/poolFilter.spec.js` | 筛选组合、Ban 策略、摘要与清除 |
| `src/tests/mobilePool.spec.js` | 移动端折叠与断点联动 |
| `src/tests/traitTooltip.spec.js` / `covenantTooltip.spec.js` | 浮层内容与版本联动 |
| `src/tests/app.smoke.spec.js` | 整体渲染与版本切换冒烟 |
