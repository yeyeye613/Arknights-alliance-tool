/**
 * data/ 与 domain/ 之间的唯一适配层
 *
 * 现状：`data/versions.js` 同时承担「版本注册表」和「干员解析规则」两种职责
 * （审计 3.6 / F4）。在把它拆开之前，domain 里所有对它的调用都收敛到本文件：
 * 一是给 JS 实现补上签名，二是将来拆分时只需要改这一处。
 *
 * P4 之后本文件会退化为 entities/operator.ts 的薄封装。
 */
import type {
  BanStrategy,
  Covenant,
  Equipment,
  OperatorBase,
  TeamEntry,
  Trait,
} from "@/domain/types";
import {
  ADDITIONAL_GROUP,
  CORE_GROUP,
  DEFAULT_VERSION_ID,
  findOperatorEverywhere as rawFindOperatorEverywhere,
  getCovenantsByGroup as rawGetCovenantsByGroup,
  getEffectiveOperatorCovenants as rawGetEffectiveOperatorCovenants,
  getGameVersion as rawGetGameVersion,
  getOperatorCovenants as rawGetOperatorCovenants,
  getOperatorTier as rawGetOperatorTier,
  getOperatorTraits as rawGetOperatorTraits,
  isSelfOperatorRegistered as rawIsSelfOperatorRegistered,
} from "@/data/versions.js";

export { ADDITIONAL_GROUP, CORE_GROUP, DEFAULT_VERSION_ID };

/**
 * 领域函数接受的版本对象
 *
 * 不直接用 GameVersion：调用方可能传注册表条目、ref 里的对象、
 * 或测试里手工构造的最小桩，只要字段够用即可。
 */
export interface GameVersionLike {
  covenants?: Record<string, Covenant>;
  operators?: Record<string, OperatorBase>;
  equipments?: Record<string, Equipment>;
  banStrategy?: BanStrategy;
  selfOperatorStrategy?: "direct" | "faction";
}

/** 按 id 取版本，未知 id 回退到默认版本（历史上是盟约版） */
export function getGameVersion(id?: string | null): GameVersionLike {
  return rawGetGameVersion(id as string) as GameVersionLike;
}

/** 取某版本指定分组（core / additional）的盟约名称 */
export function getCovenantsByGroup(
  version: GameVersionLike,
  group: string,
): string[] {
  return (rawGetCovenantsByGroup(version, group) ?? []) as string[];
}

/** 解析干员的基础盟约（自选干员按版本策略推断） */
export function getOperatorCovenants(
  name: string,
  version: GameVersionLike,
): string[] {
  return (rawGetOperatorCovenants(name, version) ?? []) as string[];
}

/** JS 侧 getEffectiveOperatorCovenants 接受的形状 */
type JsTeamEntry = string | { name?: string; equipments?: string[] };

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

/** 解析干员等阶（自选干员回退到 selfOp 登记值） */
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
