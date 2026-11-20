/**
 * 编队规则（纯函数）
 *
 * 之前这些判定散在 useTeamManagement（上限提示）、TeamPanel（截断、
 * 跨版本干员提示）、App.vue / SavedTeamsPanel（版本回退）里，
 * 同一条规则有多份实现。这里收口成纯函数，组件只负责呈现。
 */
import { DEFAULT_VERSION_ID } from "./versionAdapter";
import type { GameVersionLike } from "./versionAdapter";
import type { OperatorInstance } from "./types";

/**
 * 编队是否还能再加一名干员
 * @param currentLength 当前人数
 * @param limit 编队上限
 */
export function canAddToTeam(currentLength: number, limit: number): boolean {
  return currentLength < limit;
}

/**
 * 是否超出编队上限
 * @param team 编队
 * @param limit 编队上限
 */
export function exceedsTeamLimit(
  team: readonly unknown[] | null | undefined,
  limit: number,
): boolean {
  return (team?.length ?? 0) > limit;
}

/**
 * 截断到编队上限（不改原数组）
 * @param team 编队
 * @param limit 编队上限
 */
export function truncateToLimit<T>(
  team: readonly T[] | null | undefined,
  limit: number,
): T[] {
  return (team ?? []).slice(0, limit);
}

/**
 * 干员是否不属于当前版本干员池（切换版本后可能残留其他版本的干员）
 *
 * 自选干员不算跨版本：它们来自 selfOp 配置，不随版本变化。
 * @param op 编队中的干员
 * @param version 版本数据
 */
export function isOperatorMissing(
  op: Pick<OperatorInstance, "name" | "isSelfOperator"> | null | undefined,
  version: GameVersionLike,
): boolean {
  if (op?.isSelfOperator) {
    return false;
  }
  return !version?.operators?.[op?.name ?? ""];
}

/**
 * 编队中不属于当前版本的干员数量
 * @param team 编队
 * @param version 版本数据
 */
export function countMissingOperators(
  team: readonly (Pick<OperatorInstance, "name" | "isSelfOperator">)[] | null | undefined,
  version: GameVersionLike,
): number {
  return (team ?? []).filter((op) => isOperatorMissing(op, version)).length;
}

/**
 * 编队/合集所属版本，缺省归入默认版本
 *
 * 替换掉 5 处散落的 `xxx?.version || DEFAULT_VERSION_ID`。
 * @param item 编队或合集
 * @param fallback 缺省版本 id
 */
export function resolveTeamVersionId(
  item: { version?: string } | null | undefined,
  fallback: string = DEFAULT_VERSION_ID,
): string {
  return item?.version || fallback;
}
