/**
 * 编队与合集的持久化仓储
 *
 * 存档结构由本文件与 `localStore` 决定，composable 只管内存里的响应式数组：
 * - 落库时剥离 `expanded`（纯 UI 状态，存下来只会让人误以为「上次展开过」）
 * - 读回时统一补 `expanded: true`
 *
 * 存档结构本身不改：`SavedTeam[]` 与 `PersistedCollection[]` 的字段与旧版一致。
 */
import type { SavedTeam, TeamCollection } from "@/entities/team";
import { STORAGE_KEYS } from "@/infrastructure/storage/keys";
import { readJSON, writeJSON } from "@/infrastructure/storage/localStore";

/** 落库形态：不含仅用于界面的 expanded */
export type PersistedCollection = Omit<TeamCollection, "expanded">;

/**
 * 存档里的内容只要是合法 JSON 就会被读出来，但历史上出现过存档被手动改成
 * 对象 / 字符串的情况，此时 `.map` 会直接抛错、整个列表打不开。
 * 这里按「读不出来就当没有」处理，与 JSON 解析失败的回退语义保持一致。
 */
const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

/** 读取未归类编队；缺失或损坏时返回空数组 */
export function loadTeams(): SavedTeam[] {
  return asArray<SavedTeam>(readJSON<unknown>(STORAGE_KEYS.savedTeams, []));
}

/** 读取合集，并把 expanded 统一重置为展开 */
export function loadCollections(): TeamCollection[] {
  return asArray<PersistedCollection>(
    readJSON<unknown>(STORAGE_KEYS.teamCollections, []),
  ).map((collection) => ({ ...collection, expanded: true }));
}

/** 保存未归类编队 */
export function saveTeams(teams: SavedTeam[]): void {
  writeJSON(STORAGE_KEYS.savedTeams, teams);
}

/** 去掉 UI 状态，得到落库用的合集对象 */
export function toPersistedCollection(
  collection: TeamCollection,
): PersistedCollection {
  const persisted = { ...collection };
  delete persisted.expanded;
  return persisted;
}

/** 保存合集（自动剥离 expanded） */
export function saveCollections(collections: TeamCollection[]): void {
  writeJSON(STORAGE_KEYS.teamCollections, collections.map(toPersistedCollection));
}
