/**
 * 盟约统计 Composables
 * 负责：按当前游戏版本统计编队中各盟约的数量、判断激活状态
 */
import { computed, unref } from "vue";
import {
  getCovenantsByGroup,
  getEffectiveOperatorCovenants,
  getGameVersion,
  CORE_GROUP,
} from "@/data/versions.js";
import {
  getMorphCovenant,
  getOperatorEquipmentNames,
} from "@/data/equipment.js";
import { useGameVersion } from "./useGameVersion.js";

/** 调和类盟约会为核心盟约额外 +1 人数 */
const HARMONY_COVENANT = "调和";

/**
 * 统计编队中各盟约的数量
 * @param {Array} team - 编队数组 [{ name, avatar }]
 * @param {Object} version - 当前版本数据（含 covenants / operators）
 * @returns {Object} 盟约名称 -> 数量
 */
function countBaseCovenants(team, version) {
  const stats = {};
  const seen = new Set();

  (team || []).forEach((op) => {
    const name = typeof op === "string" ? op : op?.name;
    if (!name || seen.has(name)) return;
    seen.add(name);

    // 含装备加成：变形同构体可让携带者额外视为某个盟约成员
    getEffectiveOperatorCovenants(op, version).forEach((cov) => {
      stats[cov] = (stats[cov] || 0) + 1;
    });
  });

  return stats;
}

/**
 * 统计「变形同构体」为各盟约额外贡献的人数
 * 用于界面上标出该盟约的人数里有多少来自装备，避免误以为装备没生效
 * @param {Array} team - 编队数组
 * @param {Object} version - 当前版本数据
 * @returns {Object} 盟约名称 -> 由装备加成的人数
 */
function countMorphCovenants(team, version) {
  const stats = {};
  const seen = new Set();

  (team || []).forEach((op) => {
    const name = typeof op === "string" ? op : op?.name;
    if (!name || seen.has(name)) return;
    seen.add(name);

    const covenant = getMorphCovenant(
      getOperatorEquipmentNames(op),
      version,
    );
    if (covenant) {
      stats[covenant] = (stats[covenant] || 0) + 1;
    }
  });

  return stats;
}

/**
 * 应用调和加成：调和激活时，场上核心盟约人数 +1
 * @param {Object} baseStats - 原始统计
 * @param {Object} covenants - 当前版本盟约数据
 * @returns {Object} 加成后的统计
 */
function applyHarmonyBonus(baseStats, covenants) {
  const nextStats = { ...baseStats };
  const harmonyActive =
    (baseStats[HARMONY_COVENANT] || 0) >=
    (covenants?.[HARMONY_COVENANT]?.activateCount || 99);

  if (!harmonyActive) {
    return nextStats;
  }

  const coreCovenants = Object.keys(covenants || {}).filter(
    (name) => covenants[name]?.group === CORE_GROUP,
  );

  coreCovenants.forEach((name) => {
    if ((baseStats[name] || 0) > 0) {
      nextStats[name] = baseStats[name] + 1;
    }
  });

  return nextStats;
}

/**
 * 获取已激活的盟约列表
 * @param {Object} presentCovCounts - 盟约统计结果
 * @param {Object} covenants - 当前版本盟约数据
 * @returns {Array} 已激活盟约数组 [{ name, ...covenants[name] }]
 */
function getActivatedCovList(presentCovCounts, covenants) {
  const activeCovList = [];

  Object.keys(presentCovCounts).forEach((name) => {
    const config = covenants?.[name];
    if (config && presentCovCounts[name] >= config.activateCount) {
      activeCovList.push({ name, ...config });
    }
  });
  return activeCovList;
}

/**
 * 提取盟约中「在场 N 名不同干员」类进阶效果的阈值
 * @param {string} name - 盟约名称
 * @param {Object} covenants - 当前版本盟约数据
 * @returns {Array<number>} 去重升序的阈值
 */
function getAdvancedThresholds(name, covenants) {
  const effects = covenants?.[name]?.effects || [];
  const thresholds = effects
    .map((effect) => {
      const condition = effect.condition || "";
      const matched = condition.match(/^在场(\d+)名不同/);
      return matched ? Number(matched[1]) : null;
    })
    .filter((value) => value !== null);

  return [...new Set(thresholds)].sort((a, b) => a - b);
}

/**
 * 计算各盟约已解锁的进阶等级
 * @param {Object} presentCovCounts - 盟约统计结果
 * @param {Object} covenants - 当前版本盟约数据
 * @returns {Object} 盟约名称 -> 已解锁层级数
 */
function getAdvancedCovLevels(presentCovCounts, covenants) {
  const levels = {};

  Object.keys(presentCovCounts).forEach((name) => {
    const thresholds = getAdvancedThresholds(name, covenants);
    levels[name] = thresholds.filter(
      (threshold) => presentCovCounts[name] >= threshold,
    ).length;
  });

  return levels;
}

/**
 * 获取编队中出现的盟约（用于排序显示），激活的排在前面
 * @param {Object} presentCovCounts - 盟约统计结果
 * @param {Object} covenants - 当前版本盟约数据
 * @returns {Array} 盟约名称数组
 */
function getSortedCovenants(presentCovCounts, covenants) {
  return Object.keys(presentCovCounts).sort((a, b) => {
    const aActive =
      presentCovCounts[a] >= (covenants?.[a]?.activateCount || 99);
    const bActive =
      presentCovCounts[b] >= (covenants?.[b]?.activateCount || 99);
    return bActive - aActive;
  });
}

/**
 * 主 composable：传入 team，返回所有盟约相关的计算属性
 * @param {import('vue').Ref<Array>} teamRef - 编队的响应式引用
 * @param {Object|import('vue').Ref<Object>} [versionSource] - 版本数据（含 covenants / operators），默认取当前版本
 * @returns {Object} 盟约相关的响应式数据
 */
export function useCovenantStats(teamRef, versionSource) {
  const { currentVersion } = useGameVersion();

  const version = computed(() => {
    if (!versionSource) {
      return currentVersion.value;
    }
    const resolved = unref(versionSource);
    return resolved?.covenants ? resolved : getGameVersion(resolved);
  });

  const covenants = computed(() => version.value.covenants || {});

  const baseCovCounts = computed(() =>
    countBaseCovenants(teamRef.value, version.value),
  );

  // 其中由「变形同构体」带来的额外人数，仅用于界面标注
  const morphCovCounts = computed(() =>
    countMorphCovenants(teamRef.value, version.value),
  );

  // 盟约统计（已应用调和加成）
  const presentCovCounts = computed(() =>
    applyHarmonyBonus(baseCovCounts.value, covenants.value),
  );

  // 出现的盟约（排序后）
  const presentCovList = computed(() =>
    getSortedCovenants(presentCovCounts.value, covenants.value),
  );

  // 已激活盟约列表
  const activeCovList = computed(() =>
    getActivatedCovList(presentCovCounts.value, covenants.value),
  );

  // 触发进阶在场效果的盟约
  const advancedCovLevels = computed(() =>
    getAdvancedCovLevels(presentCovCounts.value, covenants.value),
  );

  return {
    // 数据
    covenantsData: covenants, // 当前版本盟约数据
    coreCovenants: computed(() => getCovenantsByGroup(version.value, CORE_GROUP)),
    presentCovCounts, // 所有盟约的统计 { 拉特兰: 2, 精准: 1 }
    presentCovList, // 出现的盟约名称（排序后）
    activeCovList, // 激活的盟约 详情
    advancedCovLevels,
    morphCovCounts, // 变形同构体为各盟约贡献的人数
  };
}
