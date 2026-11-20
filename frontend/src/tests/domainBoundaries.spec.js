/**
 * 分层护栏：领域层必须保持「纯」
 *
 * 这条测试不验证业务行为，而是防止后续改动把 Vue 响应式、
 * 浏览器副作用、界面依赖偷偷塞回领域层（审计建议的可检查约束 1/4/5/6）。
 * 它读的是源码文本，因此不需要额外依赖。
 *
 * P4 起领域层按 feature 就近放在 `src/features/<feature>/domain`，
 * 因此按目录名递归收集，而不是写死一个路径。
 * `src/entities` 不在扫描范围：它是实体类型与数据访问器，允许 import data。
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 所有名为 domain 的目录下的 .ts 文件（相对 src 的路径） */
function collectDomainFiles(dir = SRC_DIR) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === "tests") continue;
    if (entry.name === "domain") {
      for (const file of readdirSync(full)) {
        if (file.endsWith(".ts")) {
          found.push(relative(SRC_DIR, join(full, file)).split(sep).join("/"));
        }
      }
      continue;
    }
    found.push(...collectDomainFiles(full));
  }
  return found;
}

const domainFiles = collectDomainFiles();

/** 读取某个领域文件的源码（参数是相对 src 的路径） */
const sourceOf = (name) => readFileSync(join(SRC_DIR, name), "utf8");

/**
 * 去掉注释后再检查
 *
 * domain 文件的文档注释里会写「不得读写 localStorage」这类约束，
 * 直接匹配文本会误伤自己。
 */
const codeOf = (name) =>
  sourceOf(name)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

describe("domain 层约束", () => {
  it("至少包含预期的领域文件", () => {
    const names = domainFiles.map((file) => file.split("/").pop());
    expect(names).toEqual(
      expect.arrayContaining([
        "covenantStats.ts",
        "equipRules.ts",
        "filterOperators.ts",
        "shareCodec.ts",
        "shareErrors.ts",
        "shareImport.ts",
        "teamRules.ts",
      ]),
    );
  });

  it("不依赖 Vue（无 ref/computed/watch，也不 import vue）", () => {
    for (const file of domainFiles) {
      const code = codeOf(file);
      expect(code, `${file} 不应 import vue`).not.toMatch(/from\s+["']vue["']/);
      expect(code, `${file} 不应使用响应式 API`).not.toMatch(
        /\b(ref|computed|watch|reactive|toRef|unref)\s*\(/,
      );
    }
  });

  it("不直接操作浏览器存储与对话框", () => {
    for (const file of domainFiles) {
      const code = codeOf(file);
      expect(code, `${file} 不应读写 localStorage`).not.toMatch(/localStorage/);
      expect(code, `${file} 不应调用 alert/prompt/confirm`).not.toMatch(
        /\b(alert|prompt|confirm)\s*\(/,
      );
      expect(code, `${file} 不应直接操作 DOM`).not.toMatch(/\bdocument\s*\./);
    }
  });

  it("不反向依赖视图层与 composables", () => {
    for (const file of domainFiles) {
      const code = codeOf(file);
      expect(code, `${file} 不应 import 组件`).not.toMatch(
        /from\s+["'][^"']*\/components\//,
      );
      expect(code, `${file} 不应 import composables`).not.toMatch(
        /from\s+["'][^"']*\/composables\//,
      );
      expect(code, `${file} 不应 import .vue`).not.toMatch(
        /from\s+["'][^"']*\.vue["']/,
      );
      // 资源路径工具依赖 import.meta.env.BASE_URL，属打包环境（D3）
      expect(code, `${file} 不应 import 资源路径工具`).not.toMatch(
        /from\s+["'][^"']*\/shared\/lib\/assets/,
      );
    }
  });

  /**
   * 领域层只回答「失败在哪」，文案归视图层（S13）
   *
   * 只拦一种最容易复发的形态：抛错时直接塞一句中文。错误码化之后
   * 领域层应当是 `throw new ShareError("EMPTY")` 这类写法。
   * 不做通用国际化扫描——注释里的中文由 `codeOf` 先剥掉。
   */
  it("不产出用户文案：抛错只带错误码", () => {
    const CJK_IN_THROWN = new RegExp(
      "throw\\s+new\\s+\\w*Error\\s*\\(\\s*" +
        "(?:\"[^\"]*[\\u4e00-\\u9fff]|'[^']*[\\u4e00-\\u9fff]|`[^`]*[\\u4e00-\\u9fff])",
    );
    for (const file of domainFiles) {
      expect(
        codeOf(file),
        `${file} 不应在领域层抛中文文案，改为 throw new ShareError(code)`,
      ).not.toMatch(CJK_IN_THROWN);
    }
  });
});
