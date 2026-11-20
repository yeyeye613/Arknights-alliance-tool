/**
 * 盟约实体：类型与分组解析
 */
import type { GameVersionLike } from "./version";
import { getCovenantsByGroup as rawGetCovenantsByGroup } from "@/data/versions.js";

/** 盟约效果条目 */
interface CovenantEffect {
  type: string;
  description: string;
  /** 生效条件，如「在场3名不同乌萨斯干员」 */
  condition?: string;
  /** 进阶后的描述 */
  upgraded?: string;
}

/** 盟约（核心 / 附加） */
export interface Covenant {
  name?: string;
  group: string;
  /** 激活所需人数 */
  activateCount: number;
  effects: CovenantEffect[];
}

/** 取某版本指定分组（core / additional）的盟约名称 */
export function getCovenantsByGroup(
  version: GameVersionLike,
  group: string,
): string[] {
  return (rawGetCovenantsByGroup(version, group) ?? []) as string[];
}
