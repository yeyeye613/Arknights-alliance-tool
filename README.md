# 明日方舟卫戍协议配队工具

一个基于 Vue 3 + Vite 的明日方舟「卫戍协议：盟约」配队小工具，用来辅助抓位、拼盟约、保存编队，以及通过分享码交流阵容。

在线体验：
[https://yeyeye613.github.io/Arknights-alliance-tool/](https://yeyeye613.github.io/Arknights-alliance-tool/)

## 项目简介

这个项目面向卫戍协议配队场景，核心目标是把游戏内分散的信息整理成一个更容易试验和对比的编队面板。

在当前实现中，你可以：

- 从干员池中按名称、阶数、阵营、盟约筛选干员
- 点击或拖拽干员进入当前编队
- 实时查看当前编队的盟约层数和已激活效果
- 自定义编队人数上限
- 保存编队，并按合集进行整理
- 将单个编队或整个合集导出为分享码
- 通过分享码导入其他人的编队数据
- 将数据持久化到浏览器 `localStorage`

## 功能说明

### 1. 干员池

- 支持名称搜索
- 支持按阶数筛选
- 支持按主阵营筛选
- 支持按子盟约筛选
- 展示干员头像与阶数信息

干员数据来源于 `src/data/operators.json`，图片资源位于 `public/resource/image`。

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

保存数据分为两类：

- `savedTeams`：未归类编队
- `teamCollections`：合集编队

### 4. 分享与导入

项目内置压缩分享码机制：

- `ARKTEAM`：单编队分享码
- `ARKCOL`：合集分享码
- `ARKFULL`：完整数据分享码基础实现已存在

分享码实现位于 `src/composables/useShareCode.js`，使用 `pako` 对数据进行压缩和 Base64 编码。

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
│  ├─ composables            # 编队、分享、弹窗、存储逻辑
│  ├─ data                   # 干员与盟约静态数据
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

- `PoolPanel.vue`：干员池筛选与选择
- `TeamPanel.vue`：当前编队与盟约效果展示
- `SavedTeamsPanel.vue`：已保存编队与合集管理
- `SaveTeamModal.vue`：保存/编辑编队
- `ShareModal.vue`：展示分享码
- `ImportModal.vue`：导入分享码

### 组合式函数

- `useTeamManagement.js`：当前编队增删与上限处理
- `useTeamStorage.js`：本地存储与合集管理
- `useShareCode.js`：分享码生成、解析、导入
- `useModalState.js`：弹窗状态与临时消息
- `useCovenantStats.js`：盟约层数与激活效果统计

## 数据说明

### `operators.json`

记录每位干员的：

- 阶数
- 所属阵营/盟约
- 特性说明

### `covenants.json`

记录每个盟约的：

- 激活条件
- 基础效果
- 在场效果
- 关联干员列表

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

当前仓库已经包含基础单元测试，主要覆盖：

- 分享码生成、解析、导入
- 本地存储初始化、保存、移动、删除

测试文件位于：

- `src/tests/useShareCode.spec.js`
- `src/tests/useTeamStorage.spec.js`

## 后续可扩展方向

- 补充自选干员能力的完整交互
- 增加装备系统与一次性装备管理
- 完善完整数据导入导出入口
- 增加更多异常处理与数据校验
- 补充更多 UI 和业务测试
