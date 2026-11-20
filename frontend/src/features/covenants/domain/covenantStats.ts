/**
 * 盟约统计（纯函数）
 *
 * 从 useCovenantStats 抽出的全部计算逻辑，不依赖 Vue，
 * 可以直接单测、也可以在将来的模拟器里复用。
 *
 * 规则要点：
 * 1. 同一干员只计一次（按名字去重，防止编队里出现重复项时层数虚高）
 * 2. 装备「变形同构体」可让携带者额外视为某盟约成员，且不重复计数
 * 3. 「调和」激活时，场上每个已出现的核心盟约人数 +1（只加一层，不递归传递）
 * 4. 进阶等级由效果文案里的「在场N名不同…」反推（历史契约，见 README/审计）
 */
import { CORE_GROUP } from "@/data/versions.js";
import type { Covenant } from "@/entities/covenant";
import { getCovenantsByGroup } from "@/entities/covenant";
import type { TeamEntry } from "@/entities/operator";
import { getEffectiveOperatorCovenants } from "@/entities/operator";
import type { GameVersionLike } from "@/entities/version";
import { getMorphCovenant, getOperatorEquipmentNames } from "@/features/equipment/domain/equipRules";

/** 调和类盟约会为核心盟约额外 +1 人数 */
export const HARMONY_COVENANT = "调和";

/** 盟约名 -> 人数 */
export type CovenantCounts = Record<string, number>;

/** 已激活的盟约（含原始配置） */
export type ActivatedCovenant = Covenant & { name: string };

export interface CovenantStats {
  /** 原始人数（未应用调和加成） */
  baseCounts: CovenantCounts;
  /** 其中由「变形同构体」贡献的人数 */
  morphCounts: CovenantCounts;
  /** 应用调和加成后的人数 */
  counts: CovenantCounts;
  /** 出现的盟约，激活的排在前面 */
  presentList: string[];
  /** 已激活盟约列表 */
  activeList: ActivatedCovenant[];
  /** 各盟约已解锁的进阶层级数 */
  advancedLevels: CovenantCounts;
}

/** 取编队元素的干员名 */
const nameOf = (op: TeamEntry): string =>
  typeof op === "string" ? op : (op?.name ?? "");

/**
 * 一次遍历同时统计「原始人数」与「装备贡献人数」
 *
 * 审计发现原实现把同一份编队扫了两遍、每个干员的盟约解析也重复计算，
 * 这里合并为一次遍历。
 */
function scanTeam(
  team: readonly TeamEntry[] | null | undefined,
  version: GameVersionLike,
): { counts: CovenantCounts; morphCounts: CovenantCounts } {
  const counts: CovenantCounts = {};
  const morphCounts: CovenantCounts = {};
  const seen = new Set<string>();

  for (const op of team ?? []) {
    const name = nameOf(op);
    if (!name || seen.has(name)) continue;
    seen.add(name);

    // 含装备加成：变形同构体可让携带者额外视为某个盟约成员
    for (const covenant of getEffectiveOperatorCovenants(op, version) ?? []) {
      counts[covenant] = (counts[covenant] ?? 0) + 1;
    }

    if (typeof op !== "string") {
      const morph = getMorphCovenant(getOperatorEquipmentNames(op), version);
      if (morph) {
        morphCounts[morph] = (morphCounts[morph] ?? 0) + 1;
      }
    }
  }

  return { counts, morphCounts };
}

/**
 * 统计编队中各盟约的人数（不含调和加成）
 * @param team 编队
 * @param version 版本数据
 */
export function countBaseCovenants(
  team: readonly TeamEntry[] | null | undefined,
  version: GameVersionLike,
): CovenantCounts {
  return scanTeam(team, version).counts;
}

/**
 * 统计「变形同构体」为各盟约额外贡献的人数
 * 用于界面上标出该盟约的人数里有多少来自装备
 * @param team 编队
 * @param version 版本数据
 */
export function countMorphCovenants(
  team: readonly TeamEntry[] | null | undefined,
  version: GameVersionLike,
): CovenantCounts {
  return scanTeam(team, version).morphCounts;
}

/**
 * 应用调和加成：调和激活时，场上核心盟约人数 +1
 *
 * 只对「已经出现」的核心盟约 +1，且只加一层（不基于加成后的结果再算）。
 * @param baseCounts 原始统计
 * @param covenants 当前版本盟约数据
 */
export function applyHarmonyBonus(
  baseCounts: CovenantCounts,
  covenants: Record<string, Covenant> | null | undefined,
): CovenantCounts {
  const nextCounts: CovenantCounts = { ...baseCounts };
  const activateCount = covenants?.[HARMONY_COVENANT]?.activateCount ?? 99;
  if ((baseCounts[HARMONY_COVENANT] ?? 0) < activateCount) {
    return nextCounts;
  }

  for (const name of Object.keys(covenants ?? {})) {
    if (covenants?.[name]?.group !== CORE_GROUP) continue;
    const current = baseCounts[name] ?? 0;
    if (current > 0) {
      nextCounts[name] = current + 1;
    }
  }

  return nextCounts;
}

/**
 * 获取已激活的盟约列表
 * @param counts 盟约统计
 * @param covenants 当前版本盟约数据
 */
export function getActivatedCovList(
  counts: CovenantCounts,
  covenants: Record<string, Covenant> | null | undefined,
): ActivatedCovenant[] {
  const active: ActivatedCovenant[] = [];

  for (const name of Object.keys(counts)) {
    const config = covenants?.[name];
    if (config && (counts[name] ?? 0) >= config.activateCount) {
      active.push({ name, ...config });
    }
  }

  return active;
}

/**
 * 提取盟约中「在场 N 名不同干员」类进阶效果的阈值
 *
 * 注意：这是对文案做正则反推，属于历史契约。
 * 数据侧的文本一旦改写（例如「场上」），这里会静默失效，
 * 因此 domain 测试里固定了几条真实数据作为护栏。
 * @param name 盟约名
 * @param covenants 当前版本盟约数据
 * @returns 去重升序的阈值
 */
export function getAdvancedThresholds(
  name: string,
  covenants: Record<string, Covenant> | null | undefined,
): number[] {
  const effects = covenants?.[name]?.effects ?? [];
  const thresholds: number[] = [];

  for (const effect of effects) {
    const matched = /^在场(\d+)名不同/.exec(effect.condition ?? "");
    if (matched) {
      thresholds.push(Number(matched[1]));
    }
  }

  return [...new Set(thresholds)].sort((a, b) => a - b);
}

/**
 * 计算各盟约已解锁的进阶等级
 * @param counts 盟约统计
 * @param covenants 当前版本盟约数据
 */
export function getAdvancedCovLevels(
  counts: CovenantCounts,
  covenants: Record<string, Covenant> | null | undefined,
): CovenantCounts {
  const levels: CovenantCounts = {};

  for (const name of Object.keys(counts)) {
    const thresholds = getAdvancedThresholds(name, covenants);
    levels[name] = thresholds.filter(
      (threshold) => (counts[name] ?? 0) >= threshold,
    ).length;
  }

  return levels;
}

/**
 * 获取编队中出现的盟约（用于排序显示），激活的排在前面
 * @param counts 盟约统计
 * @param covenants 当前版本盟约数据
 */
export function getSortedCovenants(
  counts: CovenantCounts,
  covenants: Record<string, Covenant> | null | undefined,
): string[] {
  const isActive = (name: string): number =>
    (counts[name] ?? 0) >= (covenants?.[name]?.activateCount ?? 99) ? 1 : 0;

  return Object.keys(counts).sort(
    (a, b) => isActive(b) - isActive(a),
  );
}

/**
 * 一次算出界面需要的全部盟约数据
 * @param team 编队
 * @param version 版本数据
 */
export function computeCovenantStats(
  team: readonly TeamEntry[] | null | undefined,
  version: GameVersionLike,
): CovenantStats {
  const covenants = version?.covenants ?? {};
  const { counts: baseCounts, morphCounts } = scanTeam(team, version);
  const counts = applyHarmonyBonus(baseCounts, covenants);

  return {
    baseCounts,
    morphCounts,
    counts,
    presentList: getSortedCovenants(counts, covenants),
    activeList: getActivatedCovList(counts, covenants),
    advancedLevels: getAdvancedCovLevels(counts, covenants),
  };
}

/** 核心盟约名称列表（供界面分组渲染） */
export function listCoreCovenants(version: GameVersionLike): string[] {
  return getCovenantsByGroup(version, CORE_GROUP);
}
