# 技术债处置方案：D3 / S13 / S11

**已归档。** S13 与 D3 已完成（2026-11-20），§1、§2 是执行记录，不需要再动手。
S11 是唯一没开工的一项，已整段搬进 [docs/architecture/backlog.md](../architecture/backlog.md)，
本文档的 §3 保留原始实测与排序依据，供回看出处。

> 对应 `refactoring-plan.md` 4.2「待处理」。三项共同的病根是**缺少显式契约**：
> D3 缺「干员实例长什么样」，S13 缺「领域层怎么表达拒绝」，S11 缺「这些函数收什么参数」。
> 因此顺序不是按难度，而是按**契约先于覆盖**：先定形状与错误码，再用类型把它们铺开。

**进度**：S13 已完成（`c0b5824` + `d5ef936`）；D3 已完成（`794857e`）；
S11 未开工——它的收益取决于前两项的契约，现在可以按 §3 的阶段 0 起手。
以下保留方案原文与实际执行时的偏差说明，便于回看决策依据。

## 0. 总览

| 编号 | 一句话 | 改动面 | 可逆性 | 顺序 |
| --- | --- | --- | --- | --- |
| S13 | 领域层抛中文文案，视图层透传 | 2 个 domain 文件（15 处 throw）+ 2 个消费点 + 2 个 spec | 高（纯代码，无数据） | 1 · **已完成** |
| D3 | 干员实例 5 处各自拼装 | 1 个实体类型 + 5 处构造点 + 7 处头像 + 6 处列表 key | 中（触及存档读取路径） | 2 · **已完成** |
| S11 | `vue-tsc` 只覆盖 TS 文件 | 实测 15 文件 / 80 错误，可分批 | 高（每文件独立） | 3 · 未开工 |

**为什么 S13 先做**：它最小，且会顺带建立「护栏 spec 拦回退」的范式，D3 和 S11 之后都复用同一套护栏写法。

---

## 1. S13：领域层不产文案，只产错误码

### 1.1 实测

`features/*/domain/*.ts` 共 **15 处 `throw new Error("<中文>")`**：

| 文件 | 处数 | 代表文案 |
| --- | --- | --- |
| `features/sharing/domain/shareCodec.ts` | 9 | 「分享码数据不完整」「分享码来自更新的版本」「不支持的分享码类型」 |
| `features/sharing/domain/shareImport.ts` | 6 | 「密语不能为空」「编队中没有有效干员」「合集中没有有效编队」 |

两个消费点**原样透传**，等于把文案写成了对外契约：

- `features/sharing/composables/useShareCode.js:82` → `notify?.(error?.message || "导入失败")`
- `features/sharing/components/ImportDialog.vue:167` → `errorMessage.value = error.message || "分享码格式错误"`

`src/tests/shareCompat.spec.js` 里 5 条断言直接校中文字符串（`toThrow("密语不能为空")`），修文案就要改「协议权威快照」，这是错的耦合。

而 P3 已经定过正确做法：领域层返回 `boolean`，文案在视图层（`addToTeam` / `openSaveTeamModal` 返回 `false`）。现在两套并存。

### 1.2 方案

**领域层抛类型化错误，文案归视图层。**

```ts
// features/sharing/domain/shareErrors.ts（新增）
export const SHARE_ERROR_CODES = [
  "EMPTY",            // 输入为空
  "EMPTY_PAYLOAD",    // 码里只有前缀与零值字节
  "BAD_CHAR",         // Base62 非法字符
  "INCOMPLETE",       // 字节流被截断
  "DATA_CORRUPT",     // varint 溢出 / 解压失败
  "BAD_FORMAT",       // 紧凑码 magic 不匹配
  "UNSUPPORTED_TYPE", // 类型字节不认识
  "VERSION_TOO_NEW",  // 码来自更新的版本
  "LEGACY_FORMAT",    // 历史码无法识别
  "LEGACY_CORRUPT",   // 历史码 base64 / inflate 失败
  "LEGACY_VERSION",   // 历史码版本号不支持
  "NO_OPERATOR",      // 导入后编队为空
  "NO_COLLECTION",    // 导入后合集为空
] as const;

export type ShareErrorCode = (typeof SHARE_ERROR_CODES)[number];

export class ShareError extends Error {
  readonly code: ShareErrorCode;
  constructor(code: ShareErrorCode) {
    super(code);
    this.name = "ShareError";
    this.code = code;
  }
}
```

**最终是 13 个 code，不是初稿的 10 个。** 原打算把语义相近的合并（「内容为空」与「密语不能为空」、
「分享码数据损坏」与「分享码已损坏，请重新复制完整内容」），但这会改掉用户在某类边界输入下
看到的话。code 的粒度应当等于「用户可见的每一种失败」，不是「开发者认为的原因分类」。
13 个 code 与改前 13 条不同文案一一对应，零 UX 变化。

`SHARE_ERROR_CODES` 是运行时可遍历的数组，类型由它派生——这样文案表可以写一条 spec
断言「code 与文案一一对应」，而纯 `type` 做不到。

```ts
// features/sharing/messages.ts（新增）
export const SHARE_ERROR_MESSAGES: Record<ShareErrorCode, string> = {
  EMPTY: "密语不能为空",
  BAD_FORMAT: "无效的分享码格式",
  // …逐条照搬现有文案，零 UX 变化
  NO_COLLECTION: "合集中没有有效编队",
};

export function shareMessageOf(error: unknown, fallback: string): string;
```

放 feature 根目录而不是 `components/`：`useShareCode`（composable）与 `ImportDialog`
（component）都要用它，放任一子目录都会形成「composable 依赖 component」的倒挂。

消费点改为 `shareMessageOf(error, 兜底文案)`，兜底由调用方给（`useShareCode` 是「导入失败」，
`ImportDialog` 是「分享码格式错误」）。

顺带堵了一处此前没人注意的**第三方文案泄漏**：`pako.inflate` 失败时抛的是英文报错
（"incorrect header check"），原样透到界面。现在包一层 catch 转成 `DATA_CORRUPT`。

### 1.3 为什么不做全局文案表

没有多语言需求。把 3 条组件内联文案也搬进 `messages.ts` 只是增加一层间接跳转，读者要跨文件才能看懂一句提示。**本项目只需要一条规则：文案在视图层，规则值不在文案里硬编码。** 具体动作：

- `SelfOperatorDialog.vue:158/167` 的 `>= 2` 与文案里的「2 名」是同一个规则值，提成 `const MAX_SELF_PER_TIER = 2`，文案插值 `` `最多只能选择 ${MAX_SELF_PER_TIER} 名` ``，避免改规则漏改文案。
- 同文件 `:159` / `:168` 两处 `alert()` 改走 App 的 toast（与 `notify` 同一通道）。阻塞式 `alert` 在移动端会卡渲染，且与项目其它提示不一致。

### 1.4 步骤（2 个提交，已按此执行）

1. `refactor(sharing)` `shareErrors.ts` + `messages.ts`；16 处 throw 改 `ShareError`（15 处原有 + 1 处新增的 pako 包裹）；两个消费点改用 `shareMessageOf`；`shareCompat.spec.js` 的文案断言改为校 code。
2. `refactor(roster)` 配额常量化 + 2 处 `alert` 改 toast（要经 `PoolPanel` 转发到 `App.vue` 的 toast 通道，中间补一层 `notify` 事件）。

### 1.5 验收（实际执行结果）

- `shareCompat.spec.js` 4 条协议快照**一个字符未变**——改的只是错误断言的形式。
- 断言改为取 code：`codeOf(() => parseCode(""))` 返回 `"EMPTY"`。用局部 `codeOf` 辅助函数而不是
  `toThrow(expect.objectContaining(...))`，避免依赖匹配器的隐式语义。
- 护栏（`domainBoundaries.spec.js` 新增一条）：`throw new \w*Error("含中文` 即失败。只覆盖这一种
  最易复发的形态，不做通用国际化扫描。
- 新增 `shareMessages.spec.js` 4 条：每个 code 有非空文案、文案表与 code 列表一一对应、从
  `ShareError` 取文案、非领域异常走兜底。
- 新增 `selfOperatorDialog.spec.js` 2 条：五阶/六阶配额各自独立，超额不再加入且发出 `notify`。
- 测试 218 → 225。

### 1.6 风险（已核对）

- 文案表与 code 列表是两份运行时数据，可能漂移 → 已用 spec 断言集合相等。
- `shareCompat.spec.js` 改的是文案断言，不是协议断言，已在提交信息里写明理由，
  避免后来者误以为协议变了。
- `alert` 换 toast 在 jsdom 里无法目测，靠 `emitted("notify")` 断言兜住。

---

## 2. D3：干员实例的形状契约

### 2.1 实测（比审计记录更严重）

原审计记 4 处，实测 **5 处**，且多出一个审计没提的问题：

| 位置 | id | tier | isSelfOperator | equipments | avatar |
| --- | --- | --- | --- | --- | --- |
| `PoolPanel.vue:162` 基础池 | `index` · number | — | — | — | `getAvatarUrl` |
| `useSelfOperators.js:38` | — | ✓ | `true` | — | `getAvatarUrl` |
| `PoolPanel.vue:172` 自选池再包一层 | `self-…` · string | 继承 | 继承 | — | 继承 |
| `SelfOperatorDialog.vue:189/195` | — | `Ⅴ`/`Ⅵ` | `true` | — | `getAvatarUrl` |
| `shareImport.ts:152` | `index` · number | 可能 `undefined` | boolean | 可选 | `getAvatarUrl` |

三个此前未被记录的事实：

1. **`id` 的唯一消费者是 `PoolPanel.vue:52` 的 `:key="op.id"`**，但它有三种形态（number / string / 不存在）。而它是必要的：`selfOperators.json` 登记 27 个名字，`operators.mengyue.json` 113 个，**重名 12 个**（仇白、星熊、莫斯提马…），池子是 `[...base, ...self]` 直接拼接，同名项靠 `id` 前缀才区分开。去掉 `id` 而不换 key 方案，会立刻产生 12 组重复 key。
2. **`avatar` 是派生值，却被固化进实例并落库**：`addToTeam` 用 `{...op}` 复制，`saveTeams` 原样写入 localStorage。而 `getAvatarUrl` 依赖 `import.meta.env.BASE_URL`——**`shareImport.ts:16` 从 `@/shared/lib/assets.js` 导入它，等于领域层依赖 Vite 环境**，`domainBoundaries.spec.js` 没拦是因为它不在禁止清单里。
3. **分享码协议不含 `avatar` 与 `id`**（`shareCodec.ts:204` 只编码 name/tier/isSelf/equipments）。所以这两个字段纯粹是内部冗余，改它们不碰协议。

### 2.2 决策

| 方案 | 结论 | 理由 |
| --- | --- | --- |
| A. 保留 `id`，统一成 string | 否 | 仍是派生值进存档，且要维护两套前缀规则 |
| B. 删 `id`，v-for 用 `name` 做 key | 否 | 12 组重名立刻重复 key |
| **C. 删 `id` 与 `avatar`，实例只留语义字段，key 由纯函数派生** | **采用** | 存档变小、领域层不再依赖 Vite、重名由 key 函数显式处理 |

目标形态：

```ts
// entities/operator.ts
export interface OperatorInstance {
  name: string;
  tier?: string;
  isSelfOperator?: boolean;
  equipments: string[];      // 恒为数组，不再 undefined
}

export function createOperatorInstance(
  input: Pick<OperatorInstance, "name"> & Partial<Omit<OperatorInstance, "name">>,
): OperatorInstance;

export function operatorKey(op: Pick<OperatorInstance, "name" | "isSelfOperator">): string;
// `${op.isSelfOperator ? "self:" : ""}${op.name}`
```

构造函数与 key 函数都放 `entities/operator.ts`：前者是形状归一（不是业务规则），
与类型同处一文件便于对照；后者是实例身份的定义，与形状属同一件事。原计划把
`operatorKey` 放进 `features/roster/domain/`，实际落地时发现那会为一个 key
格式化函数单开一个 domain 文件，收益不抵成本。

`createOperatorInstance` **不 import `getAvatarUrl`**——头像由视图按 `name` 现算。

### 2.3 步骤（实际是 1 个提交）

原计划拆 4 个提交（类型 → 构造点 → 模板 → 分享码），实际落地时发现拆不开：
删字段会让所有构造点同时编译失败，任何中间态要么留死代码、要么半迁移。
一个提交内做四件事，提交信息里按区域分述：

1. `entities/operator.ts`：加 `createOperatorInstance` + `operatorKey`，`equipments` 改必填，删 `avatar`/`id`。
2. 5 处构造点改走构造器（`PoolPanel` 基础池与自选池、`useSelfOperators`、`SelfOperatorDialog`、`shareImport`）。
3. 7 处 `:src="op.avatar"` 改 `getAvatarUrl(op.name)`（`OperatorCard:16`、`TeamCard:9`、`SaveTeamDialog:56`、`ImportDialog:33/55`、`ShareDialog:53/85`）。`OperatorCard` 内部算一次即覆盖其所有调用方。
4. `shareImport` 去掉 `getAvatarUrl` 依赖；`domainBoundaries.spec.js` 增加「`domain/` 不得 import `shared/lib/assets`」一条。

计划漏算的两处：

- **`:key="op.id"` 不止 `PoolPanel` 一处**：`TeamCard`、`SaveTeamDialog`、`ShareDialog`、`ImportDialog` 各两处，共 6 处列表预览也用它。全部换成 `operatorKey(op)`。
- **`equipRules` 需要宽松输入**：`getOperatorEquipmentNames` / `equipToOperator` 原本用 `Pick<OperatorInstance, "equipments">`，`equipments` 必填后，来自历史存档与分享码中间结构的 `{ equipments?: string[] }` 不再兼容。抽出 `EquipmentCarrier = { equipments?: string[] } | null | undefined`，比要求每个调用方补 `equipments: []` 更贴近事实。

### 2.4 存档兼容

**不加迁移脚本。** 旧档里多出的 `avatar`/`id` 字段对读取无害（`OperatorInstance` 结构宽松，多余键不影响赋值），渲染时一律按 `name` 重算头像。用户下次保存时，`createOperatorInstance` 产出干净对象自然覆盖旧字段——**惰性自愈，写时归一**。这与 `teamsRepository` 现有「读不出来就当没有」的容错风格一致。

### 2.5 验收

- `entities/operator.ts` 中 `avatar` 与 `id` 字段为 0。
- 新增 `entities/tests/operatorInstance.spec.js`（6 条）：字段集合固定、不再产出 `avatar`/`id`、空装备槽被过滤、同名不同来源 key 不同、池内 key 不撞。
- `shareCompat.spec.js` 4 条协议快照不变（协议真的没动）。
- 两处「没装备时 `equipments` 为 `undefined`」的断言改为空数组——变的只是内存形状，编码侧仍按有无装备决定是否写该段，快照串未变。
- 手测：导出一个旧分享码 → 头像显示正常（证明走的是 `getAvatarUrl` 而非存档字段）。

### 2.6 同名干员共存（已定）

用户确认：**干员池里同名干员可以共存**（版本池一份、自选池一份）。因此：

- 不去重，`operatorPool` 就是两段直接拼接；
- `operatorKey` 必须带来源前缀，否则同类项撞 key；
- `canAddToTeam` 仍只判数量、不判重名——同一干员可以进队两次。

这条是产品决策，代码里按此实现，不再作为待确认项。

---

## 3. S11：渐进类型化

### 3.1 实测（这次是真的量过了）

给 15 个 JS 源文件加 `// @ts-check` 后跑 `vue-tsc -b`，**共 80 个错误**：

| 文件 | 错误数 | 备注 |
| --- | --- | --- |
| `library/composables/useSavedTeams.js` | 26 | 246 行，7 次提交 |
| `roster/composables/usePoolFilters.js` | 16 | 208 行 |
| `sharing/composables/useShareCode.js` | 6 | churn 最高，10 次提交 |
| `covenants/composables/useCovenantStats.js` | 6 | |
| 其余 11 个文件 | 26 | 单个 1–5 条 |

按错误码：**28 × TS7006（隐式 any）**、22 × TS2339（属性不存在）、14 × 可赋值性、6 × TS2314（`@type {Array}` 缺泛型）、3 × TS7053、2 × TS8032、2 × TS7034、3 × TS7005。

关键观察：**22 条「属性不存在」多数是 `data/*.js` 返回 `Object` 推断传染的结果**。例如 `useCovenantStats.js:31` 的 `Property 'covenants' does not exist on type 'string | Object'`——因为 `getGameVersion` 来自未标注的 JS。这决定了顺序：**先补 data 层，下游自然掉一批**。

### 3.2 方案

不做全局 `checkJs: true`：`tsconfig.app.json` 的 `include` 只有 `ts/tsx/vue`，JS 是靠 `allowJs` 作为被 import 的依赖进入 program 的，全局开启语义模糊，且会一次性把 80 条变成红灯。改用**已在 `versions.js` 验证过的 `@ts-check` 逐文件开启**，零配置、可回滚。

**双轨决策规则：**

- 文件改动超过 30% 或需要重构 → `git mv x.js x.ts`，用真类型。
- 只补契约、不改结构 → 留 `.js` + `// @ts-check` + JSDoc。

### 3.3 步骤

**阶段 0（1 提交，先做，收益最大）**

- `data/equipment.js` 加 `@ts-check`（实测仅 1 条错误）。
- `data/versions.js` 给 `getOperatorCovenants` / `getOperatorTier` / `getOperatorTraits` / `findOperatorEverywhere` / `getEffectiveOperatorCovenants` 补返回类型（后四个目前靠 `entities` 侧 `as` 断言兜着，属于把类型责任错放在调用方）。
- 复跑，记录错误总数作为新基线。预期 TS2339 一批消失。

**阶段 1（每文件 1 提交，按「错误数 × churn」排序）**

1. `useSavedTeams.js`（26 错）——246 行，风险最高，转 `.ts`
2. `usePoolFilters.js`（16 错）——208 行，转 `.ts`
3. `useShareCode.js`（6 错）——churn 最高，转 `.ts`（与 S13 同一文件，S13 先做完更顺）
4. `useCovenantStats.js` / `useTeamManagement.js` / 其余 ——留 `.js` + `@ts-check`

**阶段 2（SFC，只跟着改动走）**

不给 24 个 SFC 排期。规则：**改到哪个组件，就给它加 `lang="ts"`**；顺序上叶子优先（`OperatorCard`、`TeamCard`），容器最后（`PoolPanel`、`TeamPanel`、`App.vue`，props/emit 面大、一次暴露太多）。批量转换会同时引爆 24 个文件的 props/emit 类型，无法定位回归。

### 3.4 门禁

新增 `npm run verify`：`typecheck && lint && test:run && knip`。每个阶段结束跑一次，任何一项红了不进入下一阶段。当前基线：typecheck 0 / lint 0 / 218 测试 / knip 0。

### 3.5 与 D3 的关系

`useSavedTeams` 的 26 条错误里，相当一部分是它对 `team` 里干员对象做字段假设（`{...op}`、`op.avatar`、`op.id`）。**D3 做完后这一批会自然消失**——这是把 D3 排在 S11 之前的直接理由，而不是「顺手」。

### 3.6 明确不做

- 全局 `checkJs`。
- ESLint type-aware 规则（`@typescript-eslint/no-unsafe-*`）：全量跑一遍成本高，收益与 `tsc` 重叠。
- 为凑覆盖率把 24 个 SFC 一次转完。

---

## 4. 不做清单

| 想法 | 为什么不做 |
| --- | --- |
| 全局 i18n / 文案中心 | 没有多语言需求，抽表只增加跳转层级 |
| 干员实例加 UUID | 分享码按码表 `ref` 编码，`id` 不参与协议；UUID 会让存档无法人工比对 |
| 存档 schemaVersion 迁移 | 多余字段无害，惰性归一即可；加版本号是空转（P3 已论证过同类问题） |
| 一次性把 24 个 SFC 转 TS | 回归无法定位，且与「按需」原则冲突 |
