/**
 * 分层护栏：domain/ 必须保持「纯」
 *
 * 这条测试不验证业务行为，而是防止后续改动把 Vue 响应式、
 * 浏览器副作用、界面依赖偷偷塞回领域层（审计建议的可检查约束 1/4/5/6）。
 * 它读的是源码文本，因此不需要额外依赖。
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DOMAIN_DIR = join(dirname(fileURLToPath(import.meta.url)), "../domain");

const domainFiles = readdirSync(DOMAIN_DIR).filter((name) =>
  name.endsWith(".ts"),
);

/** 读取某个领域文件的源码 */
const sourceOf = (name) => readFileSync(join(DOMAIN_DIR, name), "utf8");

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
    expect(domainFiles).toEqual(
      expect.arrayContaining([
        "covenantStats.ts",
        "equipRules.ts",
        "filterOperators.ts",
        "shareImport.ts",
        "teamRules.ts",
        "versionAdapter.ts",
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
    }
  });
});
