/**
 * 干员实体：类型与版本相对的解析
 *
 * 这些访问器都要读数据集，因此依赖方向是 `entities → data`；
 * `data/versions.js` 不反向 import 本文件。
 */
import type { GameVersionLike } from "./version";
import {
  findOperatorEverywhere as rawFindOperatorEverywhere,
  getEffectiveOperatorCovenants as rawGetEffectiveOperatorCovenants,
  getOperatorCovenants as rawGetOperatorCovenants,
  getOperatorTier as rawGetOperatorTier,
  getOperatorTraits as rawGetOperatorTraits,
  isSelfOperatorRegistered as rawIsSelfOperatorRegistered,
} from "@/data/versions.js";

/** 干员特质 */
export interface Trait {
  type?: string;
  trigger?: string;
  description?: string;
  upgraded?: string;
}

/** 干员静态数据（operators*.json 的条目） */
export interface OperatorBase {
  tier?: string;
  covenants?: string[];
  traits?: Trait[];
}

/**
 * 编队中的干员实例
 *
 * 注意：这不是静态数据，而是界面拼装出来的运行时对象。
 * 几处拼装的字段并不完全一致（见审计 D3）。
 */
export interface OperatorInstance {
  id?: number | string;
  name: string;
  avatar?: string;
  tier?: string;
  isSelfOperator?: boolean;
  equipments?: string[];
}

/** 编队元素：允许直接给干员名（历史数据结构里 team 可能存字符串） */
export type TeamEntry = OperatorInstance | string | null | undefined;

/** JS 侧 getEffectiveOperatorCovenants 接受的形状 */
type JsTeamEntry = string | { name?: string; equipments?: string[] };

/** 解析干员的基础盟约（自选干员按版本策略推断） */
export function getOperatorCovenants(
  name: string,
  version: GameVersionLike,
): string[] {
  return (rawGetOperatorCovenants(name, version) ?? []) as string[];
}

/** 解析干员的有效盟约（含变形同构体的装备加成） */
export function getEffectiveOperatorCovenants(
  op: TeamEntry,
  version: GameVersionLike,
): string[] {
  if (op === null || op === undefined) return [];
  return (
    (rawGetEffectiveOperatorCovenants(op as JsTeamEntry, version) as
      | string[]
      | undefined) ?? []
  );
}

/** 解析干员等阶（自选干员回退到 selfOperators 登记值） */
export function getOperatorTier(
  name: string,
  version: GameVersionLike,
): string {
  return (rawGetOperatorTier(name, version) ?? "") as string;
}

/** 解析干员特质 */
export function getOperatorTraits(
  name: string,
  version: GameVersionLike,
): Trait[] {
  return (rawGetOperatorTraits(name, version) ?? []) as Trait[];
}

/** 跨版本（含自选干员）查找干员，找不到返回 null */
export function findOperatorEverywhere(name: string): OperatorBase | null {
  return (rawFindOperatorEverywhere(name) ?? null) as OperatorBase | null;
}

/**
 * 该名字是否在「自选（甄选）干员」配置里登记过
 *
 * 只表示「配置里有」，不代表它就是自选干员：
 * 有的干员同时属于某个版本的正式干员池，要结合当前版本判断。
 */
export function isSelfOperatorRegistered(name: string): boolean {
  return Boolean(rawIsSelfOperatorRegistered(name));
}
