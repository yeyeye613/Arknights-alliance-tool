/**
 * 生成 / 追加分享码干员码表（src/data/opCodebook.json）
 *
 * 铁律：码表只允许「追加」，永远不要重排或删除已有条目。
 * 分享码里存的是干员在码表中的下标，一旦顺序变化，历史分享码就会解析错人。
 *
 * 用法：node scripts/gen-codebook.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codebookPath = path.join(root, "src/data/opCodebook.json");

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(root, rel), "utf8"));
}

const [codebook, mengyue, guicheng, selfOp] = await Promise.all([
  readJson("src/data/opCodebook.json").catch(() => []),
  readJson("src/data/operators.json"),
  readJson("src/data/operators.guicheng.json"),
  readJson("src/data/selfOp.json"),
]);

const known = new Set(codebook);
const incoming = new Set([
  ...Object.keys(mengyue),
  ...Object.keys(guicheng),
  ...Object.keys(selfOp),
]);

const added = [...incoming]
  .filter((name) => !known.has(name))
  .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const next = [...codebook, ...added];
await writeFile(codebookPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

console.log(
  `码表 ${codebook.length} → ${next.length}${added.length ? `，追加 ${added.length} 个：${added.join("、")}` : "，无新增"}`,
);
