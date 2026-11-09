# 明日方舟卫戍协议配队工具

一个基于 Vue 3 + Vite 的明日方舟「卫戍协议」配队小工具，用来辅助抓位、拼盟约、保存编队，以及通过分享码交流阵容。

支持两个游戏版本，可在页面右上角切换：

- **卫戍协议：盟约**（2024 赛季数据）
- **卫戍协议·规程**（当前赛季数据）

在线体验：
[https://yeyeye613.github.io/Arknights-alliance-tool/](https://yeyeye613.github.io/Arknights-alliance-tool/)

## 项目简介

这个项目面向卫戍协议配队场景，核心目标是把游戏内分散的信息整理成一个更容易试验和对比的编队面板。

在当前实现中，你可以：

- 在「盟约」与「规程」两个版本之间切换，干员池、盟约效果、编队列表都会跟着切换
- 从干员池中按名称、阶数、阵营、盟约筛选干员
- 点击或拖拽干员进入当前编队
- 实时查看当前编队的盟约层数和已激活效果
- 自定义编队人数上限
- 保存编队，并按合集进行整理
- 将单个编队或整个合集导出为分享码
- 通过分享码导入其他人的编队数据
- 将数据持久化到浏览器 `localStorage`

## 功能说明

### 0. 游戏版本切换

- 页面顶部提供版本切换按钮，选中状态会写入 `localStorage`，下次打开保持上次选择
- 切换版本后，干员池、阵营/盟约筛选项、盟约效果文案、已保存编队列表都会对应变化
- 已保存的编队、合集、分享码都会记录所属版本；加载其他版本的编队时会自动切换版本
- 若当前编队中存在不属于当前版本的干员，会以红色虚线标记并提示，这些干员不参与盟约层数统计

版本数据集中在 `src/data/versions.js` 注册，切换状态由 `src/composables/useGameVersion.js` 管理。

### 1. 干员池

- 支持名称搜索
- 筛选区可折叠：收起后只保留搜索框、视图切换与「筛选」按钮，干员列表获得更大空间
- 阵营 / 盟约支持「图标 ⇄ 文字」两种筛选方式，偏好写入 localStorage
- 支持按阶数、特质类型、特质触发时机筛选（选项按当前版本数据自动推导）
- 支持 Ban 盟约：独立的内联区块，点击图标即可 Ban / 取消；**干员的全部盟约都被 Ban 才会隐藏**，只要还有一个未 Ban 的盟约就仍会显示；折叠后区块标题只显示已 Ban 数量的红色角标
- 已选条件以「已筛选」摘要回显，可逐项取消或一键清除（筛选区折叠时仍可见）
- 展示干员头像与阶数信息
- 鼠标悬停干员卡片（干员池或当前编队）可查看特质：类别、触发时机、效果与进阶后效果

干员数据按版本存放在 `src/data/operators.json`（盟约）与 `src/data/operators.guicheng.json`（规程），图片资源位于 `public/resource/image`。特质悬停提示由 `src/components/TraitTooltip.vue` + `src/composables/useTraitTooltip.js` 实现，浮层挂载到 `body` 上，避免被滚动容器裁剪。

### 2. 当前编队

- 支持拖拽调整编队顺序
- 支持移除单个干员
- 支持清空当前编队
- 支持设置编队上限，范围为 `1` 到 `20`
- 自动统计当前编队携带的盟约
- 展开后可查看已激活盟约的详细效果

### 3. 编队管理

- 保存当前编队
- 编辑已保存编队
- 删除已保存编队
- 将未归类编队移动到指定合集
- 展开/收起合集查看内部编队
- 按当前版本过滤展示编队（未标记版本的历史存档归入「盟约」）

保存数据分为两类：

- `savedTeams`：未归类编队
- `teamCollections`：合集编队

### 4. 分享与导入

项目内置压缩分享码机制：

- `ARKTEAM`：单编队分享码
- `ARKCOL`：合集分享码
- `ARKFULL`：完整数据分享码基础实现已存在

分享码实现位于 `src/composables/useShareCode.js`，使用 `pako` 对数据进行压缩和 Base64 编码。分享码中额外记录版本标识（`g` 字段），导入时会自动切换到对应版本。

## 技术栈

- Vue 3
- Vite
- TypeScript
- JavaScript Composables
- Vitest
- `vue-draggable-plus`
- `pako`

## 本地开发

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

## 项目结构

```text
frontend
├─ public
│  └─ resource/image         # 干员与盟约图片资源
├─ src
│  ├─ components             # 页面组件与弹窗组件
│  ├─ composables            # 版本、编队、分享、弹窗、存储逻辑
│  ├─ data                   # 干员、盟约、版本注册表
│  ├─ tests                  # Vitest 单测
│  ├─ utils                  # 图片与通用工具方法
│  ├─ App.vue                # 页面主入口
│  └─ main.ts                # 应用挂载入口
├─ docs                      # 开发过程中的补充文档
├─ vite.config.ts            # Vite 配置
└─ package.json              # 前端脚本与依赖
```

## 核心模块

### 页面组件

- `VersionSwitch.vue`：游戏版本切换
- `PoolPanel.vue`：干员池筛选与选择
- `TeamPanel.vue`：当前编队与盟约效果展示
- `SavedTeamsPanel.vue`：已保存编队与合集管理
- `SaveTeamModal.vue`：保存/编辑编队
- `ShareModal.vue`：展示分享码
- `ImportModal.vue`：导入分享码

### 组合式函数

- `useGameVersion.js`：当前游戏版本状态与数据视图
- `useTeamManagement.js`：当前编队增删与上限处理
- `useTeamStorage.js`：本地存储与合集管理
- `useShareCode.js`：分享码生成、解析、导入
- `useModalState.js`：弹窗状态与临时消息
- `useCovenantStats.js`：盟约层数与激活效果统计（按版本取数据）

## 数据说明

数据均整理自 [PRTS 明日方舟中文 Wiki](https://prts.wiki)：

- 卫戍协议：盟约 —— <https://prts.wiki/w/卫戍协议：盟约>
- 卫戍协议·规程 / PRTS盟约记录 —— <https://prts.wiki/w/卫戍协议·规程/PRTS盟约记录>

### `versions.js`

版本注册表，声明每个版本可用的盟约数据、干员数据与展示文案：

```js
{
  id: "guicheng",
  label: "卫戍协议·规程",
  covenants: covenantsGuicheng,
  operators: operatorsGuicheng,
  selfOperatorStrategy: "faction",
}
```

`selfOperatorStrategy` 控制「自选干员」的盟约推断方式：

- `direct`：直接使用 `selfOp.json` 中登记的核心盟约（盟约版本）
- `faction`：按阵营匹配当前版本的核心盟约，匹配不到时归为「协防干员」（规程版本）

### `covenants.json` / `covenants.guicheng.json`

记录每个盟约的：

- `group`：`core`（核心盟约）或 `additional`（附加盟约）
- `activateCount`：激活所需人数
- `effects`：基础效果 / 在场效果 / 层数效果
- `operators`：关联干员列表

### `operators.json` / `operators.guicheng.json`

记录每位干员的：

- 阶数（Ⅰ~Ⅵ）
- 所属盟约列表
- `traits`：特质列表，鼠标悬停在干员卡片上会展示

每个特质对象形如：

```json
{
  "type": "持续叠加",
  "trigger": "进入休整期时",
  "description": "转化2层【乌萨斯】临时层数为固定层数",
  "upgraded": "转化4层【乌萨斯】临时层数为固定层数"
}
```

- `type`：特质类别（作战能力 / 整备能力 / 单次叠加 / 持续叠加 / 特异化）
- `trigger`：触发时机，正文中形如 `<战斗中>` 的条件标记会在提示框里渲染成行内标签
- `upgraded`：进阶（叠加到更高层数）后的效果文本

两个版本的特质数据均来自 PRTS：规程版取自《PRTS盟约记录》页面的「干员数据库」表格（143 人全覆盖）。

## 部署说明

项目通过 GitHub Actions 自动部署到 GitHub Pages。

- 工作流文件：`.github/workflows/deploy.yml`
- 构建目录：`frontend/dist`
- 页面基路径：`/Arknights-alliance-tool/`

对应配置已写在 `vite.config.ts` 中：

```ts
base: "/Arknights-alliance-tool/"
```

## 测试现状

当前仓库已经包含单元测试，主要覆盖：

- 分享码生成、解析、导入（含版本标识）
- 本地存储初始化、保存、移动、删除
- 盟约层数、激活与进阶效果统计
- 两个版本的数据完整性与差异
- 版本切换后干员池、盟约统计联动
- 已保存编队的版本过滤与索引一致性
- 应用整体渲染冒烟测试

测试文件位于：

- `src/tests/useShareCode.spec.js`
- `src/tests/useTeamStorage.spec.js`
- `src/tests/useCovenantStats.spec.js`
- `src/tests/gameVersion.spec.js`
- `src/tests/traitTooltip.spec.js`
- `src/tests/app.smoke.spec.js`

## 后续可扩展方向

- 自选干员在规程版本下按实际阵营更细粒度地匹配盟约
- 增加装备系统与一次性装备管理
- 完善完整数据导入导出入口
- 增加更多异常处理与数据校验
- 补充更多 UI 和业务测试
