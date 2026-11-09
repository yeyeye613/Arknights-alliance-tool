# 开发说明

该目录用于存放前端开发过程中的补充说明文档。

当前项目的正式 README 已整理到：

- `frontend/README.md`

如果后续需要继续补充此目录，建议优先记录以下内容：

- 页面交互草图
- 组件职责划分
- 数据结构设计
- 盟约计算规则说明
- 后续需求与待办事项

## 当前页面结构

主页面由以下模块组成：

- `VersionSwitch.vue`：游戏版本切换（盟约 / 规程）
- `PoolPanel.vue`：干员池与筛选区
- `SavedTeamsPanel.vue`：已保存编队与合集区
- `TeamPanel.vue`：当前编队与盟约效果区
- `SaveTeamModal.vue`：保存/编辑编队弹窗
- `ShareModal.vue`：分享码弹窗
- `ImportModal.vue`：导入分享码弹窗

## 当前状态划分

多个组件之间共享的核心状态主要包括：

- 当前游戏版本（`useGameVersion.js` 内的模块级单例）
- 当前编队数据
- 已保存编队
- 编队合集
- 分享码预览数据
- 弹窗开关状态
- 临时提示消息

这些逻辑目前主要通过 `src/composables` 下的组合式函数管理。

## 多版本数据结构

版本相关数据分两层：

1. `src/data/versions.js`：版本注册表，声明每个版本对应的盟约、干员数据与文案
2. 各版本数据文件：
   - `covenants.json` / `operators.json`：卫戍协议：盟约
   - `covenants.guicheng.json` / `operators.guicheng.json`：卫戍协议·规程

约定：

- 盟约对象带 `group` 字段（`core` / `additional`），阵营筛选与盟约筛选直接由该字段推导，不再硬编码列表
- 干员通过 `name` 关联到盟约，跨版本干员会以红色虚线标注
- 已保存编队、合集、分享码都带 `version`（分享码中为 `g`）字段，缺省视为盟约版本

数据来源：PRTS 明日方舟中文 Wiki 的《卫戍协议·规程/PRTS盟约记录》页面（盟约效果、盟约所属干员，以及「干员数据库」中的干员特质）。

## 干员特质提示

- 数据：`operators.*.json` 中的 `traits` 字段（`type` / `trigger` / `description` / `upgraded`）
- 组件：`src/components/TraitTooltip.vue`，通过 `teleport` 挂载到 `body`，固定定位跟随鼠标，避免被 `overflow: auto` 的干员池裁剪
- 状态：`src/composables/useTraitTooltip.js` 维护全局单例（干员名、特质列表、坐标、备注）
- 交互：干员池卡片与当前编队中的干员都会在 `mouseenter` 时展示，`mouseleave` 隐藏；跨版本干员在提示底部附加说明
- 正文里的 `<战斗中>`、`<获得时>` 等条件标记会渲染为行内小标签

