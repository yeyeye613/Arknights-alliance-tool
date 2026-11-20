/**
 * 偏好仓储：上次的版本、筛选区形态、折叠状态、自选干员
 *
 * 这些键存的是「上次的样子」，丢了只是回到默认值，不属于用户数据。
 * 因此这里连值是"1"/"0"这类编码也一起收进来，避免调用方各写各的。
 *
 * 合法性判断不在这里：版本 id 是否注册、自选干员名字与阶数是否有效，
 * 都是业务规则，留在对应 composable 里。
 */
import { STORAGE_KEYS } from "@/infrastructure/storage/keys";
import { readJSON, readText, writeJSON, writeText } from "@/infrastructure/storage/localStore";

/** 筛选区展示形态：图标 / 文字 */
export type FilterView = "icon" | "text";

/** 上次选择的游戏版本 id；没存过时返回 null */
export function getVersionId(): string | null {
  return readText(STORAGE_KEYS.gameVersion);
}

/** 保存游戏版本 id */
export function setVersionId(id: string): void {
  writeText(STORAGE_KEYS.gameVersion, id);
}

/** 筛选区形态，未存过或值不可识别时按图标处理 */
export function getFilterView(): FilterView {
  return readText(STORAGE_KEYS.poolFilterView) === "text" ? "text" : "icon";
}

/** 保存筛选区形态 */
export function setFilterView(view: FilterView): void {
  writeText(STORAGE_KEYS.poolFilterView, view);
}

/** 筛选区是否折叠，未存过时按展开处理 */
export function getFilterCollapsed(): boolean {
  return readText(STORAGE_KEYS.poolFilterCollapsed) === "1";
}

/** 保存筛选区折叠状态 */
export function setFilterCollapsed(collapsed: boolean): void {
  writeText(STORAGE_KEYS.poolFilterCollapsed, collapsed ? "1" : "0");
}

/** 自选干员的原始缓存（未校验，交给 useSelfOperators 过滤） */
export function getSelfOperators(): unknown[] {
  const value = readJSON<unknown>(STORAGE_KEYS.selfOperators, []);
  return Array.isArray(value) ? value : [];
}

/** 保存自选干员 */
export function setSelfOperators(operators: unknown[]): void {
  writeJSON(STORAGE_KEYS.selfOperators, operators);
}
