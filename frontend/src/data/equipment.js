/**
 * 装备数据访问
 *
 * 数据来源：PRTS《卫戍协议·规程 / PRTS盟约记录》装备数据库
 * 每件装备：等阶（1-6）、售价、基础效果、进阶效果、描述；
 * 另有两类附加关系：
 * - combo / parts：组合装备（如「不退者之盾」+「不退者力场」→「不退者卫护系统」）
 * - morph：「变形同构体」的对应关系，装备该件时视为对应盟约成员
 *
 * 注：「拉特兰桥夹」→拉特兰 的对应关系来自 PRTS 变形同构体页面，
 * 但该装备不在规程装备池中（属盟约版），因此未收录进数据文件。
 *
 * 分层说明：
 * - 纯规则（槽位、morph、组合装、装配校验）在 `features/equipment/domain/equipRules.ts`；
 * - 本文件只负责「怎么读版本里的装备数据」，不再 re-export 规则。
 */

/** 等阶罗马数字 */
export const TIER_LABELS = {
  1: "Ⅰ",
  2: "Ⅱ",
  3: "Ⅲ",
  4: "Ⅳ",
  5: "Ⅴ",
  6: "Ⅵ",
};

/**
 * 取某个版本的装备池
 * @param {Object} version - 版本数据
 * @returns {Object} 装备名 -> 装备数据
 */
export function getEquipments(version) {
  return version?.equipments || {};
}

/**
 * 按名称取装备
 * @param {Object} version - 版本数据
 * @param {string} name - 装备名
 * @returns {Object|null}
 */
export function findEquipment(version, name) {
  return getEquipments(version)[name] || null;
}

/**
 * 装备列表（按等阶、名称排序）
 * @param {Object} version - 版本数据
 * @returns {Array<Object>} [{ name, ...equipment }]
 */
export function getEquipmentList(version) {
  return Object.entries(getEquipments(version))
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, "zh"));
}
