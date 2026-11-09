/**
 * 生成 / 追加分享码码表
 * - src/data/opCodebook.json    干员名
 * - src/data/equipCodebook.json 装备名
 *
 * 铁律：码表只允许「追加」，永远不要重排或删除已有条目。
 * 分享码里存的是名字在码表中的下标，一旦顺序变化，历史分享码就会解析错。
 *
 * 用法：node scripts/gen-codebook.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(rel, fallback) {
  try {
    return JSON.parse(await readFile(path.join(root, rel), "utf8"));
  } catch {
    return fallback;
  }
}

function sortNames(names) {
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

async function appendCodebook(rel, incomingNames, label) {
  const current = await readJson(rel, []);
  const known = new Set(current);
  const added = sortNames(incomingNames).filter((name) => !known.has(name));
  const next = [...current, ...added];

  await writeFile(
    path.join(root, rel),
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `${label} ${current.length} → ${next.length}` +
      (added.length ? `，追加 ${added.length} 个：${added.join("、")}` : "，无新增"),
  );
}

const [mengyue, guicheng, selfOp, equipments] = await Promise.all([
  readJson("src/data/operators.json", {}),
  readJson("src/data/operators.guicheng.json", {}),
  readJson("src/data/selfOp.json", {}),
  readJson("src/data/equipment.guicheng.json", {}),
]);

await appendCodebook(
  "src/data/opCodebook.json",
  [...Object.keys(mengyue), ...Object.keys(guicheng), ...Object.keys(selfOp)],
  "干员码表",
);

await appendCodebook(
  "src/data/equipCodebook.json",
  Object.keys(equipments),
  "装备码表",
);
