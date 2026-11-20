/**
 * 分层护栏：跨 feature 只能走公开出口
 *
 * 每个 feature 的 `index.ts` 是它对外的唯一入口。深引 `features/x/components/...`
 * 会把对方 feature 的内部结构（组件层级、composable 文件名）变成事实上的 API，
 * 之后想挪文件就会牵动一串无关模块。
 *
 * 两条规则：
 * 1. 跨 feature、以及 `app/` 引用 feature，必须 `@/features/<name>`；
 * 2. 例外：`domain/` 之间可以直连 `@/features/<name>/domain/...`——
 *    纯规则依赖纯规则不该经过一个会 re-export Vue 组件的桶，否则领域层
 *    的依赖图里会凭空出现组件。
 *
 * `tests/` 不在扫描范围：测试是白盒的，允许直接拿到被测模块。
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const FEATURES_DIR = join(SRC_DIR, "features");

/** 递归收集源码文件，跳过 tests 与依赖目录 */
function collectSourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "tests") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(js|ts|vue)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** 相对 src 的 POSIX 路径 */
const toSrcPath = (file) => relative(SRC_DIR, file).split(sep).join("/");

/** 提取 `from "@/features/<name>[/rest]"` 里的名字与剩余路径 */
const FEATURE_SPEC = /from\s+"@\/features\/([^/"]+)(\/[^"]*)?"/g;

/**
 * 判断一个文件里的跨 feature 深引
 * @param {string} srcPath 相对 src 的路径，如 `features/roster/components/PoolPanel.vue`
 * @param {string} source 文件内容
 * @returns {string[]} 违规的说明符（空数组表示合规）
 */
function findDeepFeatureImportsIn(srcPath, source) {
  const parts = srcPath.split("/");
  const owner = parts[0] === "features" ? parts[1] : null;
  const inDomain = parts.includes("domain");
  const found = [];

  for (const match of source.matchAll(FEATURE_SPEC)) {
    const target = match[1];
    const rest = match[2] ?? "";

    // 同 feature 内部随便引
    if (owner === target) continue;
    // 纯规则之间允许直连
    if (inDomain && rest.startsWith("/domain/")) continue;
    // 公开出口
    if (rest === "" || rest === "/index") continue;

    found.push(`@/features/${target}${rest}`);
  }

  return found;
}

/** 扫描一组文件，返回 `路径 -> 说明符` 的违规列表 */
function findDeepFeatureImports(files) {
  return files.flatMap((file) =>
    findDeepFeatureImportsIn(toSrcPath(file), readFileSync(file, "utf8")).map(
      (spec) => `${toSrcPath(file)} -> ${spec}`,
    ),
  );
}

const featureNames = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const sourceFiles = [
  ...collectSourceFiles(FEATURES_DIR),
  ...collectSourceFiles(join(SRC_DIR, "app")),
];

describe("feature 公开出口", () => {
  it("每个 feature 都有 index.ts", () => {
    const missing = featureNames.filter(
      (name) => !existsSync(join(FEATURES_DIR, name, "index.ts")),
    );

    expect(missing).toEqual([]);
  });

  it("跨 feature 与 app 只从桶导入", () => {
    expect(findDeepFeatureImports(sourceFiles)).toEqual([]);
  });

  it("规则本身有效：深引报出、桶与 domain 直连放行", () => {
    expect(
      findDeepFeatureImportsIn(
        "features/roster/components/PoolPanel.vue",
        'import { x } from "@/features/covenants/composables/useCovenantTooltip.js";',
      ),
    ).toEqual([`@/features/covenants/composables/useCovenantTooltip.js`]);

    expect(
      findDeepFeatureImportsIn(
        "app/App.vue",
        'import { PoolPanel } from "@/features/roster";',
      ),
    ).toEqual([]);

    expect(
      findDeepFeatureImportsIn(
        "features/covenants/domain/covenantStats.ts",
        'import { getMorphCovenant } from "@/features/equipment/domain/equipRules";',
      ),
    ).toEqual([]);

    // 同 feature 的深引不算违规
    expect(
      findDeepFeatureImportsIn(
        "features/roster/components/PoolPanel.vue",
        'import OperatorCard from "@/features/roster/components/OperatorCard.vue";',
      ),
    ).toEqual([]);
  });
});
