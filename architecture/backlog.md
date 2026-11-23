# 待办清单

这里只放**还没做完、且打算做**的事。做完就删条目，不保留记录——历史在 `docs/CHANGELOG.md`，
决策依据在 `docs/archive/`。

| # | 事项 | 类型 | 状态 |
| --- | --- | --- | --- |
| 1 | S11 渐进类型化 | 技术债 | 未开工，可起手 |
| 2 | 重写 CONTRIBUTING | 文档 | 未开工 |
| 3 | 统一架构文档目录 | 结构 | 待定 |
| 4 | `PoolPanel` 的只读 computed 绑定 | 小缺陷 | 未开工 |
| 5 | 对局运营模拟与策略轴 | 功能 | 未排期 |

---

## 1. S11 渐进类型化

`vue-tsc` 只检查 `.ts`：`domain/` 已全部是 TS，但 14 个 composable 仍是 `.js`，
24 个 SFC 全都不带 `lang="ts"`，等于没被类型检查。原方案与实测见
[archive/debt-plan.md §3](../docs/archive/debt-plan.md)。

**起手前先重测。** 下面 80 条错误是 D3 之前量的，D3 删掉 `avatar`/`id` 后
「属性不存在」那批会自然掉一部分，新数字才是基线：

```bash
cd frontend
# 给每个 JS 源临时插入 @ts-check（量完 git checkout 还原）
for f in $(find src -path '*/composables/*' -name '*.js' -not -path '*/tests/*') \
         src/app/useTeamDialog.js src/app/useToast.js src/data/equipment.js src/data/versions.js; do
  head -1 "$f" | grep -q '@ts-check' || sed -i '1i // @ts-check' "$f"
done
npx vue-tsc -b --force 2>&1 | grep -oE '^src/[^(]+' | sort | uniq -c | sort -rn
git checkout -- src    # 量完就还原
```

**阶段 0（一个提交，收益最大）**：`data/equipment.js` 加 `@ts-check`（实测仅 1 条错误）；
`data/versions.js` 给 `getOperatorCovenants` / `getOperatorTier` / `getOperatorTraits` /
`findOperatorEverywhere` / `getEffectiveOperatorCovenants` 补返回类型——它们现在靠调用方
`as` 断言兜着，类型责任放错了位置。做完复跑，剩下的数字就是阶段 1 的排序依据。

**阶段 1（每文件一个提交，按「错误数 × churn」）**：`useSavedTeams`（26 错）、
`usePoolFilters`（16 错）、`useShareCode`（6 错但 churn 最高）转 `.ts`；
其余只补 JSDoc + `@ts-check`，不改结构。

**阶段 2（SFC 跟着改动走）**：改到哪个组件就给它加 `lang="ts"`，叶子优先
（`OperatorCard`、`TeamCard`），容器最后（`PoolPanel`、`TeamPanel`、`App.vue`）。
不排期、不批量转。

**不做**：全局 `checkJs`（`include` 只有 `ts/tsx/vue`，JS 是靠 `allowJs` 作为依赖进 program 的，
全局开启语义模糊且会一次点亮全部错误）；type-aware lint（与 `tsc` 收益重叠）。
理由见归档 §3.2 与 §3.6。

## 2. 重写 CONTRIBUTING

原文件已删（`6271990`），理由是它写成了项目介绍，照着做不出一次可提交的改动。
重写要写成操作手册，四块即可：

1. **跑起来**：`frontend/` 下 `npm run dev` 起开发服务器；装依赖若报 `edgesOut`（npm 10 已知 bug）加
   `--legacy-peer-deps`，并手动补装 `vue-eslint-parser`
2. **提交**：`type(scope): 描述`，一次改动混多种类型就拆开，附项目实际用到的 type 清单
3. **分层红线**：domain 不碰 vue 与 localStorage、features 只走 `index.ts`、读写存储只在
   `infrastructure/storage`——每条标出**哪个 spec 会拦你**（`domainBoundaries` / `featureBoundaries`）
4. **改完自查**：`npm run verify` 一条命令跑完类型、lint、测试、死代码；当前基线
   **246 测试 / 31 文件**、eslint `--max-warnings 0` 可过、knip 无输出

写完要把引用接回去：`README.md` 文档表一行 + 数据说明一句、`architecture/overview.md`
的分享码段、`architecture/data-model.md` 的扩展表。

## 3. 统一架构文档目录

现状是分裂的：**活文档在仓库根 `architecture/`**（overview / module-map / data-model / data-flow），
**历史在 `docs/archive/`**，而 `docs/AGENT.md` 与 `README.md` 又用 `architecture/...` 这种
以 `docs/` 为基准的写法指过去。两种改法，选一种即可：

- 把根目录四个文件 `git mv` 进 `docs/architecture/`，全仓链接改一轮（一次性，之后只有一套路径）；
- 保持现状，在 `docs/AGENT.md` 的 Read First 里写明「根 `architecture/` 是活文档，
  `docs/archive/` 是历史」，避免下一个人找错。

## 4. `PoolPanel` 的只读 computed 绑定

```vue
<VueDraggable v-model="filteredPool" :sort="false" :disabled="!canDrag">
```

`filteredPool` 是 `computed`，拖动时会触发 Vue 的「computed is readonly」告警。
行为无影响（`pull: 'clone'` + `sort: false` 不会回写），改成 `:model-value` 即可根治。
改完在浏览器控制台确认告警消失、拖拽入队仍正常。

## 5. 对局运营模拟与策略轴

需求基线是 [`docs/需求文档.md`](../docs/需求文档.md)（956 行 PRD）：阵容构筑已完成，
剩下的是商店刷新、招募概率、资金与等级、敌人与站位、策略轴记录与分享。
明确不做：战斗模拟、技能伤害、寻路 AI、胜负判定、策略分支比较、社区系统。

规则素材在 [`docs/rules/PLAYING.md`](../docs/rules/PLAYING.md)，来自「完整复刻卫戍协议」，
范围大于本项目。**用到哪条抽哪条**，落成 `docs/rules/` 下的单独文件，不整份引用。
