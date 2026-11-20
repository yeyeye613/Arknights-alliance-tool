/**
 * 版本实体
 *
 * `GameVersion` 描述注册表里的完整条目；`GameVersionLike` 是领域函数接受的
 * 最小形状——调用方可能传注册表条目、ref 里的对象，或测试里手工构造的桩，
 * 只要字段够用即可。
 */
import type { Covenant } from "./covenant";
import type { Equipment } from "./equipment";
import type { OperatorBase } from "./operator";
import { getGameVersion as rawGetGameVersion } from "@/data/versions.js";

/** Ban 规则：规程版为 faction（Ban 阵营即整阵营隐藏），盟约版缺省 covenant */
export type BanStrategy = "faction" | "covenant";

/** 游戏版本（versions.js 注册表的条目） */
export interface GameVersion {
  id: string;
  label: string;
  shortLabel?: string;
  covenants: Record<string, Covenant>;
  operators: Record<string, OperatorBase>;
  equipments?: Record<string, Equipment>;
  banStrategy?: BanStrategy;
  selfOperatorStrategy?: "direct" | "faction";
}

/** 领域函数接受的版本对象 */
export interface GameVersionLike {
  covenants?: Record<string, Covenant>;
  operators?: Record<string, OperatorBase>;
  equipments?: Record<string, Equipment>;
  banStrategy?: BanStrategy;
  selfOperatorStrategy?: "direct" | "faction";
}

/**
 * 按 id 取版本，未知 id 回退到默认版本（历史上是盟约版）
 *
 * 注册表本身仍在 `data/versions.js`；这里只是给 JS 实现补一个明确签名，
 * 让领域代码拿到 `GameVersionLike` 而不是 `Object`。
 */
export function getGameVersion(id?: string | null): GameVersionLike {
  return rawGetGameVersion(id as string) as GameVersionLike;
}
