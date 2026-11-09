/**
 * 游戏版本注册表
 *
 * 每个版本对应一次「卫戍协议」活动的独立数据：
 * - covenants：盟约（核心盟约 / 附加盟约），包含激活人数与效果描述
 * - operators：干员池，包含等阶与所属盟约
 *
 * 数据来源：PRTS 明日方舟中文 Wiki
 * - 卫戍协议：盟约  https://prts.wiki/w/卫戍协议：盟约
 * - 卫戍协议·规程  https://prts.wiki/w/卫戍协议·规程/PRTS盟约记录
 */
import covenantsMengyue from "./covenants.json";
import operatorsMengyue from "./operators.json";
import covenantsGuicheng from "./covenants.guicheng.json";
import operatorsGuicheng from "./operators.guicheng.json";
import selfOpConfig from "./selfOp.json";

/** 默认版本：保持与历史存档兼容 */
export const DEFAULT_VERSION_ID = "mengyue";

/** 核心盟约分组标识 */
export const CORE_GROUP = "core";
/** 附加盟约分组标识 */
export const ADDITIONAL_GROUP = "additional";

export const GAME_VERSIONS = [
  {
    id: "mengyue",
    label: "卫戍协议：盟约",
    shortLabel: "盟约",
    badge: "",
    desc: "2024 赛季数据，含拉特兰等 8 个核心盟约",
    source: "https://prts.wiki/w/卫戍协议：盟约",
    // 自选（甄选）干员直接使用 selfOp 中登记的核心盟约
    selfOperatorStrategy: "direct",
    covenants: covenantsMengyue,
    operators: operatorsMengyue,
  },
  {
    id: "guicheng",
    label: "卫戍协议·规程",
    shortLabel: "规程",
    badge: "NEW",
    desc: "当前赛季数据，新增乌萨斯 / 伊比利亚 / 莱塔尼亚、聚合等盟约",
    source: "https://prts.wiki/w/卫戍协议·规程/PRTS盟约记录",
    // 规程的甄选干员按阵营匹配核心盟约，匹配不到则分配「协防干员」
    selfOperatorStrategy: "faction",
    covenants: covenantsGuicheng,
    operators: operatorsGuicheng,
  },
];

const VERSION_MAP = GAME_VERSIONS.reduce((acc, version) => {
  acc[version.id] = version;
  return acc;
}, {});

/**
 * 按 id 获取版本数据，找不到时回退到默认版本
 * @param {string} id - 版本 id
 * @returns {Object} 版本数据
 */
export function getGameVersion(id) {
  return VERSION_MAP[id] || VERSION_MAP[DEFAULT_VERSION_ID];
}

/**
 * 判断版本 id 是否有效
 * @param {string} id - 版本 id
 * @returns {boolean} 是否有效
 */
export function isValidVersionId(id) {
  return Boolean(VERSION_MAP[id]);
}

/**
 * 取某个版本指定分组的盟约名称列表
 * @param {Object} version - 版本数据
 * @param {string} group - core / additional
 * @returns {Array<string>} 盟约名称
 */
export function getCovenantsByGroup(version, group) {
  const covenants = version?.covenants || {};
  return Object.keys(covenants).filter(
    (name) => covenants[name]?.group === group,
  );
}

/**
 * 解析干员的盟约列表（兼容自选干员）
 * - 版本干员池中存在的干员直接取数据
 * - 自选干员按版本的策略推断：盟约版直接取登记值，规程版按阵营匹配核心盟约
 * @param {string} name - 干员名
 * @param {Object} version - 版本数据
 * @returns {Array<string>} 盟约名称列表
 */
export function getOperatorCovenants(name, version) {
  const direct = version?.operators?.[name];
  if (direct?.covenants) {
    return direct.covenants;
  }

  const selfOp = selfOpConfig[name];
  if (!selfOp?.covenants) {
    return [];
  }

  if (version?.selfOperatorStrategy !== "faction") {
    return selfOp.covenants;
  }

  const coreCovenants = getCovenantsByGroup(version, CORE_GROUP);
  const matched = selfOp.covenants.filter((cov) => coreCovenants.includes(cov));
  return matched.length > 0 ? matched : ["协防干员"];
}

/**
 * 解析干员等阶（兼容自选干员）
 * @param {string} name - 干员名
 * @param {Object} version - 版本数据
 * @returns {string} 等阶，如 Ⅰ Ⅱ
 */
export function getOperatorTier(name, version) {
  return version?.operators?.[name]?.tier || selfOpConfig[name]?.tier || "";
}

/**
 * 解析干员特质列表（兼容自选干员）
 * @param {string} name - 干员名
 * @param {Object} version - 版本数据
 * @returns {Array<Object>} 特质列表 [{ type, trigger?, description, upgraded? }]
 */
export function getOperatorTraits(name, version) {
  return (
    version?.operators?.[name]?.traits || selfOpConfig[name]?.traits || []
  ).filter(Boolean);
}

/**
 * 在所有版本与自选干员中查找干员数据（用于解析分享码等跨版本场景）
 * @param {string} name - 干员名
 * @returns {Object|null} 干员数据
 */
export function findOperatorEverywhere(name) {
  for (const version of GAME_VERSIONS) {
    const data = version.operators[name];
    if (data) {
      return data;
    }
  }
  return selfOpConfig[name] || null;
}

/**
 * 获取干员所属的版本 id 列表
 * @param {string} name - 干员名
 * @returns {Array<string>} 版本 id 列表
 */
export function getOperatorVersionIds(name) {
  return GAME_VERSIONS.filter((version) => version.operators[name]).map(
    (version) => version.id,
  );
}
