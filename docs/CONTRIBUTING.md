# 参与贡献

## 1. 开发环境

```bash
cd frontend
npm ci
npm run dev
```

Node 24（与 CI 一致），npm 11。

安装使用 `npm ci`：按 `package-lock.json` 原样安装，lock 与 `package.json` 不一致时直接失败。修改依赖后重新生成 lock，与 `package.json` 一起提交。

不使用 `--legacy-peer-deps`。peer 冲突表示依赖版本线不配套，例如 `@eslint/js` 的主版本必须与 `eslint` 一致，应修正版本而不是绕过解析。

npm 10 解析部分依赖树时会以 `Cannot read properties of null (reading 'edgesOut')` 崩溃。需要重新生成 lock 时改用 npm 11：

```bash
npx -y npm@11 install
```

## 2. 代码检查

```bash
npm run verify
```

依次执行 `vue-tsc`、`eslint`、`vitest`、`knip`。提交前应全部通过。

`verify` 不包含 `npm run build`。修改构建配置，或把默认导入改为具名导入后，需额外执行构建：`vue-tsc` 不检查这类导出的缺失，只有构建阶段会失败。

## 3. 分层约束

| 约束 | 检查 |
| --- | --- |
| `features/*/domain/` 不 import vue，不使用 `ref` / `computed` / `watch` | `src/tests/domainBoundaries.spec.js` |
| `domain/` 不使用 localStorage、`alert`、`prompt`、DOM | 同上 |
| `domain/` 不 import 视图层、composables、`shared/lib/assets`（读取 `import.meta.env`） | 同上 |
| `domain/` 抛错只携带错误码，用户可见文案在 `messages.ts` | 同上 |
| 跨 feature 引用、`app/` 引用 feature，只从 `@/features/<name>` 导入 | `src/tests/featureBoundaries.spec.js` |
| localStorage 读写只在 `infrastructure/storage/` | 代码审查 |
| import 使用 `@/` 绝对路径 | 代码审查 |

`domain/` 之间允许直接引用 `@/features/x/domain/...`。

## 4. 提交与文档

提交信息格式、拆分原则与 Git 操作要求见 [AGENTS.md §7](AGENT.md#7-git-and-commit-rules)。

文档职责与更新规则见 [AGENTS.md §6](AGENT.md#6-documentation-rules)。
