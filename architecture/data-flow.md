# 关键业务流程

每个流程都标出「谁触发 → 经过哪些 composable → 落到哪里」。视图层只负责触发与呈现，真正的规则都在领域层。

---

## 1. 应用启动

```mermaid
sequenceDiagram
  participant U as 用户
  participant M as app/main.ts
  participant A as app/App.vue
  participant GV as useGameVersion
  participant TS as useSavedTeams
  participant PWA as usePwaUpdate

  U->>M: 打开页面
  M->>M: createApp(App).mount('#app')
  M->>PWA: initServiceWorker()
  Note over PWA: 仅生产构建注册；dev 直接返回
  A->>GV: useGameVersion()
  GV->>GV: readStoredVersion()
  Note over GV: 读 arknights_game_version<br/>非法或缺失 → mengyue
  A->>A: onMounted: 设置 document.title
  A->>TS: initSavedTeams()
  TS->>TS: 读 savedTeams / teamCollections
  Note over TS: 任一键解析失败 → 该键回退空数组
  A-->>U: 渲染干员池 + 空编队
```

要点：版本在**模块加载期**就已读出（模块级 `ref`），因此首帧渲染就是用用户上次选择的版本，不会出现「先显示盟约版再跳规程版」的闪烁。

---

## 2. 版本切换

```mermaid
sequenceDiagram
  participant U as 用户
  participant VS as VersionSwitch
  participant GV as useGameVersion
  participant A as app/App.vue
  participant P as PoolPanel
  participant T as TeamPanel
  participant S as SavedTeamsPanel

  U->>VS: 点击「卫戍协议·规程」
  VS->>GV: setVersion("guicheng")
  GV->>GV: isValidVersionId? 与当前相同?
  alt 有效且不同
    GV->>GV: 更新 currentVersionId<br/>preferencesRepository.setVersionId
    GV-->>VS: true
    VS->>A: emit("change", id)
    A->>A: showTempMessage("已切换到…")
  else 无效或未变化
    GV-->>VS: false
  end

  Note over P: currentVersion 是 computed，自动重算
  P->>P: 干员池 / 筛选项 / Ban 列表重建
  T->>T: useCovenantStats 用新版本 covenants 重算
  Note over T: 当前编队里不属于新版本的干员<br/>红色虚线 + 不参与统计
  S->>S: 按 currentVersionId 过滤已保存列表
  A->>A: watch 版本：无装备版本则清空临时装备池<br/>并退回干员池标签
```

设计意图：**没有「切换版本」的显式刷新动作**。所有派生数据都是 `computed`，依赖 `currentVersionId` 自动失效重算；唯一需要手工处理的是「不该跨版本存在」的会话态——临时装备池与装备标签页。

---

## 3. 添加干员与盟约统计

统计是全应用最核心的计算，链路如下：

```mermaid
flowchart LR
  CLICK["点击干员卡片<br/>或从池中拖入"] --> ADD["useTeamManagement.addToTeam<br/>超上限返回 false，App.vue 提示"]
  ADD --> TEAM["team: Ref<TeamOperator[]>"]
  TEAM --> BASE["countBaseCovenants<br/>按名字去重"]
  BASE --> EFF["getEffectiveOperatorCovenants<br/>= 基础盟约 + 变形同构体"]
  EFF --> MORPH["countMorphCovenants<br/>单独记一份来自装备的人数"]
  EFF --> HARM["applyHarmonyBonus<br/>调和激活 → 核心盟约 +1"]
  HARM --> COUNTS["presentCovCounts"]
  COUNTS --> LIST["presentCovList<br/>已激活排前"]
  COUNTS --> ACTIVE["activeCovList<br/>人数 ≥ activateCount"]
  COUNTS --> ADV["advancedCovLevels<br/>从 condition 正则提阈值"]
  LIST --> UI["CovenantsPanel"]
  ACTIVE --> UI
  ADV --> UI
  MORPH --> UI
```

关键规则：

- **同名干员只计一次**：`seen` 集合按 `name` 去重，编队里理论上不会出现重复，但导入数据可能带
- **调和加成在基础统计之后**：`调和` 自身人数达标时，所有人数 > 0 的核心盟约 +1；加成的 +1 不会再次触发其他加成（单次传递）
- **变形同构体算在 `getEffectiveOperatorCovenants` 里**，因此它带来的成员可以正常触发激活与进阶；同时单独记到 `morphCovCounts`，让界面能标注「这 3 人里有 1 人来自装备」

---

## 4. 装备装配

装备有三条入口，最终都收敛到 `TeamPanel.applyEquipment`：

```mermaid
sequenceDiagram
  participant U as 用户
  participant EP as EquipmentPool
  participant ST as EquipmentStaging
  participant A as app/App.vue
  participant TP as TeamPanel
  participant EQ as data/equipment.js
  participant PK as EquipmentPicker

  Note over U,EP: 路径一：点选（触屏友好）
  U->>EP: 点击装备卡（emit stage）
  EP->>A: stageEquipment(name)
  A->>ST: 加入临时装备池 + 设为 selected
  U->>TP: 点击干员头像
  TP->>EQ: equipToOperator(op, selectedEquipment)
  alt 槽位已满 / 重复装备
    EQ-->>TP: { ok:false, reason }
    TP->>A: emit notify（具体原因，不再继续）
  end
  EQ-->>TP: { ok:true, equipments }
  TP->>A: emit update:team（整队替换）
  TP->>A: emit equipment-equipped({name, source:"staging"})
  A->>A: 从临时装备池消耗该件

  Note over U,TP: 路径二：拖拽
  U->>ST: 拖起装备（写入自定义 MIME）
  U->>TP: 悬停干员头像（dragover）
  Note over TP: hasEquipmentDrag 只认自定义 MIME<br/>干员排序拖拽不响应
  U->>TP: drop → readEquipmentDrag → applyEquipment

  Note over U,PK: 路径三：选择器
  U->>TP: 点击头像左下角标（无选中装备时）
  TP->>PK: openEquipmentPicker(index, slot)
  U->>PK: 选装备
  PK->>TP: emit update:equipments
```

为什么用自定义 MIME：干员排序（`vue-draggable-plus`）也会写 `text/plain`，若按文本回退会把干员名当装备名，触发「装备槽已满」的误报。`readEquipmentDrag` 只认 `application/x-arknights-equipment`。

装备写入后，盟约统计自动重算（`team` 变了 → `useCovenantStats` 的 computed 失效），因此**变形同构体的加成不需要额外同步逻辑**。

---

## 5. 保存与加载编队

```mermaid
sequenceDiagram
  participant U as 用户
  participant TP as TeamPanel
  participant A as app/App.vue
  participant MS as useTeamDialog
  participant SM as SaveTeamDialog
  participant TS as useSavedTeams

  U->>TP: 点击「保存编队」
  TP->>A: emit save-team
  A->>MS: openSaveTeamModal(team)
  alt 编队为空
    MS-->>A: false
    A->>U: showTempMessage("当前编队为空，无法保存")
  else
    MS-->>A: true（showTeamModal = true）
    U->>SM: 输入队名 / 选合集（下拉值是合集名）
    SM->>A: emit save（teamData）
    A->>TS: saveTeam(teamData, showTempMessage, versionId)
    TS->>TS: 组装 { name, team, createTime, version }
    TS->>TS: addOrUpdateTeam（按合集名入合集，null 入未归类）
    TS->>TS: teamsRepository.saveTeams / saveCollections
    TS-->>A: showTempMessage("编队保存成功")
    A->>MS: closeTeamModal()
  end
```

加载：

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as SavedTeamsPanel
  participant A as app/App.vue
  participant GV as useGameVersion
  participant TM as useTeamManagement

  U->>S: 点击已保存编队
  S->>A: emit loadTeam(savedItem)
  A->>A: teamVersion = savedItem.version || "mengyue"
  alt 与当前版本不同
    A->>GV: setVersion(teamVersion)
    GV-->>A: true
    A->>A: showTempMessage("已切换到「…」")
  end
  A->>TM: loadTeamFromManagement(savedItem)
  Note over TM: team.value = [...savedItem.team]<br/>浅拷贝，加载后编辑不影响存档
  A->>A: currentTab = team
```

---

## 6. 生成分享码

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as SavedTeamsPanel
  participant A as app/App.vue
  participant SC as useShareCode
  participant CD as shareCodec
  participant M as ShareDialog

  U->>S: 点击编队「分享」
  S->>A: emit shareTeam(teamItem)
  A->>SC: generateTeamCode(teamItem, resolveTeamVersionId(...))
  SC->>CD: encodeTeam(team, "guicheng")
  CD->>CD: 写名称 + 干员引用（码表下标 / ESCAPE_REF）
  CD->>CD: 有装备 → magic 0xd0，逐件写引用
  CD->>CD: 长度 > 72 → deflate，置 COMPRESSED 标志
  CD->>CD: 头部 magic|type + flags + 版本字节
  CD->>CD: 整体 Base62，前缀 "A"
  CD-->>SC: 分享码
  SC-->>A: code
  A->>M: openShareDialog → shareCode / showShareDialog = true
  M-->>U: 自动全选，可一键复制
```

---

## 7. 导入分享码

```mermaid
sequenceDiagram
  participant U as 用户
  participant IM as ImportDialog
  participant SC as useShareCode
  participant CD as shareCodec
  participant A as app/App.vue
  participant GV as useGameVersion
  participant TS as useSavedTeams

  U->>IM: 粘贴分享码
  IM->>SC: parseCode(raw)
  SC->>SC: 去空白
  SC->>SC: 先判 ARKTEAM / ARKCOL 历史前缀
  alt 历史码
    SC->>SC: atob → pako.inflate → JSON.parse<br/>校验 v ∈ {1,2}
  else v3
    SC->>CD: decodeCompact(code)
    CD->>CD: fromBase62 → 校验 magic → 读 flags
    CD->>CD: 读版本字节 → 解压（如标记）→ 读载荷
    CD-->>SC: { v:3, t, n, ops | teams, g }
  end
  SC-->>IM: 归一化数据 + 错误（可读中文）
  IM->>IM: restoreOperators 生成预览
  U->>IM: 确认导入
  IM->>A: emit import(data)
  A->>A: data.g ≠ 当前版本 → setVersion(data.g)
  A->>SC: importFromCode(data, …)
  SC->>SC: importTeam / importCollection<br/>补 version 字段
  SC->>TS: savedTeams.push / teamCollections.push
  SC->>TS: saveAllData() 或 saveCollections()
  SC-->>A: showTempMessage("成功导入…") + 关闭弹窗
```

容错策略（都在这一层收口）：

| 情况 | 处理 |
| --- | --- |
| 码里带换行 / 空格 | `parseCode` 先 `replace(/\s+/g, "")` |
| Base62 含非法字符 | 抛「分享码包含非法字符」 |
| 载荷被截断 | 抛「分享码数据不完整」 |
| varint 溢出 | 抛「分享码数据损坏」 |
| 下标超出当前码表 | 抛「分享码来自更新的版本，请刷新页面后再导入」 |
| 干员名查不到 | `restoreOperators` 跳过并 `console.warn`，不阻断整份导入 |
| 结果为空 | 抛「编队中没有有效干员」/「合集中没有有效编队」 |

---

## 8. PWA 更新

```mermaid
sequenceDiagram
  participant SW as Service Worker
  participant PWA as usePwaUpdate
  participant P as PwaUpdatePrompt
  participant U as 用户

  Note over SW: 生产构建首访注册<br/>预缓存外壳，图片 CacheFirst
  SW->>PWA: onNeedRefresh()
  PWA->>PWA: updateAvailable = true
  P->>U: 显示「新版本可用」
  alt 立即更新
    U->>P: 点击刷新
    P->>PWA: applyUpdate()
    PWA->>SW: updateServiceWorker(true)
    SW-->>U: 页面按新缓存重载
  else 稍后
    U->>P: 关闭提示
    P->>PWA: dismissUpdate()
    Note over PWA: 本次会话继续用旧缓存
  end
```

选 `prompt` 而不选 `autoUpdate`：正在编辑的编队只在内存里，强制刷新会直接丢。宁可让用户带着旧版本用到他愿意刷新为止。

---

## 状态变更总表

| 触发 | 变更的状态 | 是否落盘 |
| --- | --- | --- |
| 点击干员 | `team` | 否 |
| 拖拽排序 | `team` | 否 |
| 点选 / 拖放装备 | `team[i].equipments` | 否 |
| 点击装备入池 | `stagedEquipments`、`selectedEquipment` | 否 |
| 保存编队 | `savedTeams` / `teamCollections` | 是 |
| 删除编队 | 同上（空合集连带删除） | 是 |
| 移动到合集 | `savedTeams` + `teamCollections` | 是（两个键） |
| 切换版本 | `currentVersionId` | 是 |
| 筛选 / Ban | 组件局部状态 | 部分（视图模式、折叠） |
| 自选干员 | `selectedSelfOperators` | 是 |
| 导入分享码 | 已保存编队 / 合集 + 可能切版本 | 是 |
