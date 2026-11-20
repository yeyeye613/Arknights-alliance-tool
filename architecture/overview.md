# 总体架构

## 定位

卫戍协议练功房是一个**纯前端单页应用**：没有后端、没有账号体系、没有网络请求。所有业务数据来自打包进产物的 JSON，用户产生的数据（编队、合集、偏好）只存在浏览器 `localStorage`，跨设备交流靠自研分享码。

这个约束不是妥协的产物，而是刻意的取舍——工具的使用场景是「对着一局游戏反复试阵容」，本地运算零延迟，也不需要为一份静态数据维护服务器。

## 运行时形态

| 维度 | 现状 |
| --- | --- |
| 部署形态 | GitHub Pages 静态站点，子路径 `/Arknights-alliance-tool/` |
| 应用类型 | 单页应用，**无 vue-router**，三块面板靠标签页切换 |
| 服务端 | 无。没有任何 `fetch` 业务接口 |
| 持久化 | `localStorage`（6 个键，见 [data-model.md](data-model.md#持久化键)） |
| 离线能力 | 生产构建注册 Service Worker，外壳预缓存 + 图片运行时缓存 |
| 首次加载体积 | 应用外壳 gzip 后数百 KB 量级，干员头像 345 张走按需加载 |

## 分层

```mermaid
flowchart TB
  subgraph VIEW["视图层 · src/components"]
    direction LR
    APP["App.vue<br/>组合根"]
    POOL["PoolPanel<br/>干员池"]
    TEAM["TeamPanel<br/>当前编队"]
    SAVED["SavedTeamsPanel<br/>已保存编队"]
    EQUIP["EquipmentPool / Staging / Picker<br/>装备三件套"]
    COV["CovenantsPanel<br/>盟约效果"]
    MODAL["Save / Share / Import / AddOp<br/>弹窗"]
    TIP["TraitTooltip / CovenantTooltip<br/>全局浮层"]
    SUB["PoolFilters / OperatorCard<br/>TeamHeader / OperatorSlot<br/>ActiveEffectsList / TeamCard<br/>P2 拆出的组合块"]
  end

  subgraph DOMAIN["领域层 · src/domain（纯函数）"]
    direction LR
    CS["covenantStats<br/>盟约统计"]
    FLT["filterOperators<br/>筛选与 Ban"]
    TR["teamRules<br/>上限 / 跨版本 / 版本回退"]
    ER["equipRules<br/>槽位 / 变形同构体"]
    SI["shareImport<br/>分享码解析与映射"]
    VA["versionAdapter<br/>data 适配层"]
  end

  subgraph COMPOSABLE["响应式层 · src/composables"]
    direction LR
    GV["useGameVersion<br/>版本单例"]
    TM["useTeamManagement<br/>当前编队"]
    TS["useTeamStorage<br/>本地存储"]
    SC["useShareCode<br/>分享与导入"]
    CSW["useCovenantStats<br/>盟约统计的 computed"]
    MS["useModalState<br/>弹窗与提示"]
    PWA["usePwaUpdate<br/>SW 注册"]
    DRAG["useEquipmentDrag<br/>拖拽载荷"]
    PF["usePoolFilters<br/>筛选状态"]
    SO["useSelfOperators<br/>自选干员"]
    TT["useTooltip<br/>浮层公共实现"]
  end

  subgraph DATA["数据层 · src/data"]
    direction LR
    REG["versions.js<br/>版本注册表"]
    EQ["equipment.js<br/>装备数据访问"]
    JSON["*.json<br/>盟约 / 干员 / 装备 / 自选 / 码表"]
  end

  subgraph UTIL["工具层 · src/utils"]
    direction LR
    CODEC["shareCodec.js<br/>v3 二进制编解码"]
    IMG["index.js<br/>图片地址"]
  end

  subgraph INFRA["基础设施层 · src/infrastructure/storage"]
    direction LR
    KEYS["keys.ts<br/>键名常量（值冻结）"]
    LSTORE["localStore.ts<br/>JSON / 文本读写与兜底"]
    RT["teamsRepository.ts<br/>编队与合集"]
    RP["preferencesRepository.ts<br/>版本 / 筛选 / 自选干员"]
  end

  VIEW --> COMPOSABLE
  COMPOSABLE --> DOMAIN
  COMPOSABLE --> DATA
  COMPOSABLE --> INFRA
  DOMAIN --> DATA
  DOMAIN --> UTIL
  VIEW --> UTIL
  DATA --> JSON
  DATA --> EQ
  RT --> LSTORE
  RP --> LSTORE
  RT --> KEYS
  RP --> KEYS

  LS[("localStorage")]
  LSTORE --> LS
```

### 依赖规则

1. **视图层不碰数据文件**。组件通过 `useGameVersion()` 拿到当前版本的 `covenants` / `operators`，或调用 `data/versions.js` 的解析函数；不 `import` 任何 `*.json`。已知例外只有 `AddOpPanel` 直接读 `selfOp.json`（自选池候选列表），待 P4 收敛到访问器。
2. **视图层与 composable 都不碰 `localStorage`**。持久化统一走 `src/infrastructure/storage`：composable 调仓储（`teamsRepository` / `preferencesRepository`），仓储调 `localStore`，键名只出现在 `keys.ts`。P3 之后 `src` 内除 `infrastructure/` 只剩 `tests/` 还会出现这个词。
3. **领域层不碰 DOM**。`useTraitTooltip` / `useCovenantTooltip` 持有的是浮层的坐标与内容状态，真正挂载由组件 `teleport` 到 `body` 完成。
4. **`src/domain` 是纯函数区**。统计、筛选、Ban、上限、装备规则、分享码映射都在这里，不 `import vue`、不读写 `localStorage`、不调 `alert`，由 `src/tests/domainBoundaries.spec.js` 读源码校验。它只允许依赖 `data/` 与 `utils/`，不允许反向依赖 `components` / `composables`。
5. **工具层无状态**。`shareCodec.js` 是纯函数集合，可脱离 Vue 单独测试。
6. **唯一组合根是 `App.vue`**。所有 composable 在此实例化，结果通过 props 下发、通过 emits 上抛；需要写别的模块的状态时用回调注入（如 `importFromCode(data, { addTeam })`），不传 ref 进去 push。
7. **基础设施层只依赖 `data/` 与同层文件**，不 import `composables` / `components`。它只回答「怎么存取」，不回答「数据合不合法」——版本 id 是否注册、自选干员阶数是否有效，仍是 composable 的判断。
8. **composable 不弹对话框**。满员、空编队这类拒绝用返回值表达（`addToTeam` / `openSaveTeamModal` 返回 `boolean`），提示文案与 `prompt` 询问留在视图层，这样 composable 可以在没有 DOM 的环境里直接测。

## 关键设计决策

### 1. 版本注册表驱动，而非按版本 fork 代码

两个赛季的数据结构基本一致，差异集中在数据与少量规则（自选干员盟约推断、Ban 策略）。`versions.js` 用一个数组声明每个版本的 `covenants` / `operators` / `equipments` 与策略字段，业务代码只读 `version.*`，不写 `if (version === 'guicheng')`。

代价是策略字段会缓慢堆积（`selfOperatorStrategy`、`banStrategy`），但比复制一份组件树便宜得多。

### 2. 状态按生命周期切分，而不是按页面切分

没引入 Pinia：项目状态只有「会话级（当前编队、弹窗）」和「持久级（已保存编队、版本偏好）」两类，`ref` + 模块级单例足够。`useGameVersion` 是唯一真单例（模块作用域 `ref`），其余 composable 在 `App.vue` 中实例化一次后按需传参。

这样做的收益是数据流始终单向：`App.vue` → props → 子组件 → emits → `App.vue`。

### 3. 无路由

三块面板是同一屏内的标签页，切换不改变 URL，也不需要刷新后恢复。省掉 router 后首屏少一个依赖，也让移动端的滚动状态处理简单得多（没有路由切换要重置滚动位置的问题）。

代价：无法直接分享「某个面板」的链接——但分享的真实需求是编队内容，已由分享码覆盖。

### 4. 分享码自研二进制协议

文字分享码要在聊天软件里传递，长度直接决定体验。v1/v2 是 `JSON → deflate → base64`，一个 12 人编队 179 字符；v3 改为二进制 + 码表引用 + varint + Base62，同编队 40–50 字符。

代价是协议脆弱性：码表顺序即协议的一部分，因此有「码表只追加」的铁律和 `npm run codebook` 脚本兜底（见 [CONTRIBUTING.md](../docs/CONTRIBUTING.md#分享码兼容性铁律)）。

### 5. PWA 缓存：外壳预缓存，图片运行时缓存

干员头像共 14 MB / 345 张，全部预缓存会拖慢首装。策略是应用外壳（js/css/html/svg）预缓存保离线可用，`/resource/image/**` 排除预缓存改走 `CacheFirst`，上限 400 条、30 天过期、配额不足自动清理。

更新用 `prompt` 模式：发现新版本只弹提示，由用户决定何时刷新——直接 `autoUpdate` 会在用户编辑编队时强制刷新丢状态。

### 6. 移动端整页滚动，而非局部滚动

桌面端左右两栏各自 `overflow-y: auto`，视觉效果紧凑；触屏上这会形成嵌套滚动陷阱（手指落在侧栏只滚侧栏）。因此 `≤1024px` 时两栏同时 `overflow: visible`，页面回归单一滚动上下文，容器 `height: auto`。

## 构建与部署

```mermaid
flowchart LR
  DEV["git push<br/>master"] --> GH["GitHub Actions<br/>ubuntu-latest · Node 24"]
  GH --> INSTALL["cd frontend<br/>npm install"]
  INSTALL --> BUILD["npm run build<br/>vue-tsc -b && vite build"]
  BUILD --> OUT["frontend/dist"]
  OUT --> PAGES["gh-pages 分支<br/>GitHub Pages"]
  PAGES --> USER["浏览器<br/>/Arknights-alliance-tool/"]
```

- 工作流：`.github/workflows/deploy.yml`，仅 `master` 推送触发
- `base` 与 PWA 的 `scope` / `start_url` 都基于 `/Arknights-alliance-tool/`，三者必须一致
- 构建含 `vue-tsc -b` 类型检查，类型错误会阻断部署

## 质量保障

约 11 个 Vitest 测试文件，覆盖重心在「最容易静默出错」的地方：

| 测试 | 关注点 |
| --- | --- |
| `useShareCode.spec.js` | 编解码往返、版本标识、装备字段、旧码兼容 |
| `useTeamStorage.spec.js` | 存储初始化、保存、移动、删除 |
| `useCovenantStats.spec.js` | 层数统计、激活判定、进阶等级 |
| `gameVersion.spec.js` | 两版本数据完整性、核心盟约数量、跨版本查找 |
| `equipment.spec.js` | 装备池完整性、变形同构体规则、槽位上限 |
| `equipmentUi.spec.js` | 装备选择器、角标、拖拽、临时装备池、标签页 |
| `poolFilter.spec.js` / `mobilePool.spec.js` | 筛选与 Ban 策略、移动端折叠 |
| `traitTooltip.spec.js` / `covenantTooltip.spec.js` | 浮层内容与版本联动 |
| `app.smoke.spec.js` | 整体渲染与版本切换冒烟 |

没有 E2E：交互密集的拖拽场景用组件级测试覆盖，样式与布局问题靠人工在 `≤1024px` / `≤768px` 两档回归。

## 边界与非目标

明确不做的事，避免后续误判为缺陷：

- **不做对局记录 / 战绩统计**：没有数据源，也超出「配队工具」范围
- **不做多端同步**：需要账号与后端，与纯前端定位冲突；跨端交流用分享码
- **不做装备的自动最优解**：装备效果存在组合与场景依赖，工具只呈现事实
- **不抓取 PRTS**：数据为人工校对后落库，构建期不访问外网

## 扩展点

| 想做的事 | 落点 |
| --- | --- |
| 新增赛季 | `data/` 加数据集 → `versions.js` 注册 → `shareCodec.js` 追加 `VERSION_CODES` |
| 新增装备 | `equipment.<id>.json` → `npm run codebook` → 补 `equipment.spec.js` |
| 新增筛选维度 | `PoolPanel.vue` 的 `activeFilterList` / `filteredPool` |
| 新增分享内容 | `shareCodec.js` 开新 magic + 新 type，旧解码器判无效 |
| 新增统计规则 | `useCovenantStats.js`，优先写成独立纯函数便于测试 |
