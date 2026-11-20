/**
 * 干员池筛选与 Ban 判定（纯函数）
 *
 * 原实现是 PoolPanel.vue 里一串 `matchXxx && ...` 的单体 computed，
 * 既无法分粒度单测，Ban 策略（faction / covenant）也埋在模板组件里。
 * 这里抽成纯函数，输入是「筛选项 + Ban 状态 + 版本数据」，输出是干员列表。
 */
import type { BanStrategy, OperatorBase } from "./types";
import type { GameVersionLike } from "./versionAdapter";
import {
  findOperatorEverywhere,
  getOperatorCovenants,
  getOperatorTier,
  getOperatorTraits,
} from "./versionAdapter";

/** 六个维度的筛选条件，空串表示不限 */
export interface PoolFilter {
  query: string;
  tier: string;
  mainCovenant: string;
  subCovenant: string;
  traitType: string;
  traitTrigger: string;
}

export const EMPTY_POOL_FILTER: PoolFilter = {
  query: "",
  tier: "",
  mainCovenant: "",
  subCovenant: "",
  traitType: "",
  traitTrigger: "",
};

/** Ban 状态 */
export interface BanState {
  banned: readonly string[];
  /**
   * Ban 策略：
   * - `faction`（规程版）：Ban 阵营 = 带该阵营的干员全部隐藏，附加盟约仍按全体被 Ban 才隐藏
   * - `covenant`（盟约版，缺省）：干员的全部盟约都被 Ban 才隐藏
   */
  strategy?: BanStrategy;
  /** 当前版本的核心盟约，用于区分「阵营」与「附加盟约」 */
  coreCovenants: readonly string[];
}

/**
 * Ban 命中判定
 * @param covenants 干员所属盟约
 * @param ban Ban 状态
 */
export function isBannedByCovenants(
  covenants: readonly string[],
  ban: BanState,
): boolean {
  if (ban.banned.length === 0 || covenants.length === 0) {
    return false;
  }

  if (ban.strategy === "faction") {
    const factionBanned = covenants.some(
      (cov) => ban.coreCovenants.includes(cov) && ban.banned.includes(cov),
    );
    if (factionBanned) {
      return true;
    }
  }

  return covenants.every((cov) => ban.banned.includes(cov));
}

/** 干员的显示等阶：编队/干员池里的实例可能自带 tier（自选干员） */
export function resolveTier(
  op: { name?: string; tier?: string } | string | null | undefined,
  version: GameVersionLike,
): string {
  if (!op) return "";
  const name = typeof op === "string" ? op : op.name;
  if (!name) return "";
  const ownTier = typeof op === "string" ? "" : op.tier;
  return ownTier || getOperatorTier(name, version) || "";
}

/**
 * 按条件筛选干员
 * @param pool 待筛选的干员列表
 * @param filter 筛选条件
 * @param ban Ban 状态
 * @param version 版本数据
 */
export function filterOperators(
  pool: readonly (OperatorBase & { name: string; tier?: string })[],
  filter: PoolFilter,
  ban: BanState,
  version: GameVersionLike,
): (OperatorBase & { name: string; tier?: string })[] {
  return pool.filter((op) => {
    // 数据里查不到的干员直接不展示（自选干员也只认登记过的）
    if (!findOperatorEverywhere(op.name)) {
      return false;
    }

    if (filter.query && !op.name.includes(filter.query)) {
      return false;
    }

    if (filter.tier && resolveTier(op, version) !== filter.tier) {
      return false;
    }

    const covenants = getOperatorCovenants(op.name, version);

    if (filter.mainCovenant && !covenants.includes(filter.mainCovenant)) {
      return false;
    }
    if (filter.subCovenant && !covenants.includes(filter.subCovenant)) {
      return false;
    }

    if (filter.traitType || filter.traitTrigger) {
      const traits = getOperatorTraits(op.name, version);
      if (
        filter.traitType &&
        !traits.some((trait) => trait.type === filter.traitType)
      ) {
        return false;
      }
      if (
        filter.traitTrigger &&
        !traits.some((trait) => trait.trigger === filter.traitTrigger)
      ) {
        return false;
      }
    }

    return !isBannedByCovenants(covenants, ban);
  });
}

/**
 * 收集当前版本出现过的特质选项
 * @param version 版本数据
 * @param field 取 type 还是 trigger
 */
export function collectTraitOptions(
  version: GameVersionLike,
  field: "type" | "trigger",
): string[] {
  const values = new Set<string>();

  for (const data of Object.values(version?.operators ?? {})) {
    for (const trait of data?.traits ?? []) {
      const value = trait?.[field];
      if (value) {
        values.add(value);
      }
    }
  }

  return [...values];
}
