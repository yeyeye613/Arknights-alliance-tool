/**
 * 装备数据访问
 *
 * 数据来源：PRTS《卫戍协议·规程 / PRTS盟约记录》装备数据库（70 件）
 * 每件装备：等阶（1-6）、售价、基础效果、进阶效果、描述；
 * 另有两类附加关系：
 * - combo / parts：组合装备（如「不退者之盾」+「不退者力场」→「不退者卫护系统」）
 * - morph：「变形同构体」的对应关系，装备该件时视为对应盟约成员
 *
 * 注：「拉特兰桥夹」→拉特兰 的对应关系来自 PRTS 变形同构体页面，
 * 但该装备不在规程装备池中（属盟约版），因此未收录进数据文件。
 */

/** 每个干员的装备槽数量 */
export const EQUIPMENT_SLOT_COUNT = 2;

/** 变形同构体：与另一件装备同携时给携带者附加盟约 */
export const MORPH_EQUIPMENT = "变形同构体";

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

/**
 * 取干员已装备的装备名（过滤空槽）
 * @param {Object} op - 编队干员 { name, equipments? }
 * @returns {Array<string>}
 */
export function getOperatorEquipmentNames(op) {
  if (!op?.equipments) return [];
  return op.equipments.filter(Boolean).slice(0, EQUIPMENT_SLOT_COUNT);
}

/**
 * 计算「变形同构体」为携带者附加的盟约
 * 规则：携带变形同构体 + 另一件带 morph 字段的装备，则视为该盟约成员
 * @param {Array<string>} equipNames - 干员装备名列表
 * @param {Object} version - 版本数据（用于校验盟约是否属于该版本）
 * @returns {string} 盟约名，不成立时为空串
 */
export function getMorphCovenant(equipNames, version) {
  const names = (equipNames || []).filter(Boolean);
  if (!names.includes(MORPH_EQUIPMENT)) return "";

  const covenants = version?.covenants || {};
  const equipments = getEquipments(version);

  for (const name of names) {
    if (name === MORPH_EQUIPMENT) continue;
    const covenant = equipments[name]?.morph;
    // 盟约必须存在于当前版本，否则忽略（例如规程版没有「拉特兰」）
    if (covenant && covenants[covenant]) {
      return covenant;
    }
  }

  return "";
}

/**
 * 组合装备提示：干员的装备是否凑成了合成装
 * @param {Array<string>} equipNames - 装备名列表
 * @param {Object} version - 版本数据
 * @returns {Array<Object>} [{ name, parts }]
 */
export function getCombinedEquipments(equipNames, version) {
  const names = (equipNames || []).filter(Boolean);
  return getEquipmentList(version)
    .filter((item) => item.parts && item.parts.every((part) => names.includes(part)))
    .map(({ name, parts }) => ({ name, parts }));
}

/**
 * 当前版本是否有装备池（盟约版没有，界面据此隐藏装备相关区域）
 * @param {Object} version - 版本数据
 * @returns {boolean}
 */
export function hasEquipmentPool(version) {
  return Object.keys(getEquipments(version)).length > 0;
}

/**
 * 给干员穿装备：校验重复与槽位上限
 * @param {Object} op - 编队干员 { equipments? }
 * @param {string} name - 装备名
 * @returns {{ok:boolean, reason?:string, equipments?:Array<string>}}
 */
export function equipToOperator(op, name) {
  if (!name) return { ok: false, reason: "empty" };

  const current = getOperatorEquipmentNames(op);
  if (current.includes(name)) {
    return { ok: false, reason: "duplicated" };
  }
  if (current.length >= EQUIPMENT_SLOT_COUNT) {
    return { ok: false, reason: "full" };
  }
  return { ok: true, equipments: [...current, name] };
}

/**
 * 卸下指定槽位的装备
 * @param {Object} op - 编队干员 { equipments? }
 * @param {number} slot - 槽位下标
 * @returns {Array<string>} 卸下后的装备名列表
 */
export function removeOperatorEquipment(op, slot) {
  return getOperatorEquipmentNames(op).filter((_, index) => index !== slot);
}
