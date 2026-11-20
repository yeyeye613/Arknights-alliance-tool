/**
 * 装备规则（纯函数）
 *
 * 从 data/equipment.js 抽出的「判定规则」部分：槽位上限、变形同构体、
 * 组合装、装配校验。数据访问（读版本里的 equipments 对象）仍留在 data/。
 *
 * 约束：本文件不得 import vue、不得读写 localStorage / DOM。
 */
import type { Equipment, GameVersion, OperatorInstance } from "./types";

/** 每个干员的装备槽数量 */
export const EQUIPMENT_SLOT_COUNT = 2;

/** 变形同构体：与另一件装备同携时给携带者附加盟约 */
export const MORPH_EQUIPMENT = "变形同构体";

type EquipmentPool = Record<string, Equipment>;

/**
 * 取版本的装备池
 * @param version 版本数据
 */
const poolOf = (version?: Partial<GameVersion> | null): EquipmentPool =>
  version?.equipments ?? {};

/**
 * 取干员已装备的装备名（过滤空槽）
 *
 * 存档里可能出现 `["", "坚守盾牌"]` 这类空串占位，这里统一收口。
 * @param op 编队干员
 */
export function getOperatorEquipmentNames(
  op?: Pick<OperatorInstance, "equipments"> | null,
): string[] {
  if (!op?.equipments) return [];
  return op.equipments.filter(Boolean).slice(0, EQUIPMENT_SLOT_COUNT);
}

/**
 * 计算「变形同构体」为携带者附加的盟约
 *
 * 规则：携带变形同构体 + 另一件带 morph 字段的装备，则视为该盟约成员。
 * 盟约必须存在于当前版本（规程版没有「拉特兰」），否则忽略。
 *
 * @param equipNames 干员装备名列表
 * @param version 版本数据
 * @returns 盟约名，不成立时为空串
 */
export function getMorphCovenant(
  equipNames?: readonly string[] | null,
  version?: Partial<GameVersion> | null,
): string {
  const names = (equipNames ?? []).filter(Boolean);
  if (!names.includes(MORPH_EQUIPMENT)) return "";

  const covenants = version?.covenants ?? {};
  const equipments = poolOf(version);

  for (const name of names) {
    if (name === MORPH_EQUIPMENT) continue;
    const covenant = equipments[name]?.morph;
    if (covenant && covenants[covenant]) {
      return covenant;
    }
  }

  return "";
}

/**
 * 组合装备提示：干员的装备是否凑成了合成装
 * @param equipNames 装备名列表
 * @param version 版本数据
 * @returns [{ name, parts }]
 */
export function getCombinedEquipments(
  equipNames?: readonly string[] | null,
  version?: Partial<GameVersion> | null,
): Array<{ name: string; parts: string[] }> {
  const names = (equipNames ?? []).filter(Boolean);
  return Object.entries(poolOf(version))
    .filter(
      ([, item]) => item.parts && item.parts.every((part) => names.includes(part)),
    )
    .map(([name, item]) => ({ name, parts: item.parts as string[] }));
}

/**
 * 当前版本是否有装备池（盟约版没有，界面据此隐藏装备相关区域）
 * @param version 版本数据
 */
export function hasEquipmentPool(
  version?: Partial<GameVersion> | null,
): boolean {
  return Object.keys(poolOf(version)).length > 0;
}

/** 装配结果：失败时带具体原因，由视图层决定文案 */
export type EquipResult =
  | { ok: true; equipments: string[] }
  | { ok: false; reason: "empty" | "duplicated" | "full" };

/**
 * 给干员穿装备：校验重复与槽位上限
 * @param op 编队干员
 * @param name 装备名
 */
export function equipToOperator(
  op: Pick<OperatorInstance, "equipments"> | null | undefined,
  name: string,
): EquipResult {
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
 * @param op 编队干员
 * @param slot 槽位下标
 */
export function removeOperatorEquipment(
  op: Pick<OperatorInstance, "equipments"> | null | undefined,
  slot: number,
): string[] {
  return getOperatorEquipmentNames(op).filter((_, index) => index !== slot);
}

/**
 * 装备成功后是否应该从临时装备池中消耗掉该件
 *
 * 临时池的语义是「本次点选的装备」，装备成功后即失效；
 * 从装备池直接拖拽（source = pool）不影响临时池。
 * @param source 装备来源
 */
export function shouldConsumeFromStaging(source: string): boolean {
  return source === "staging";
}
