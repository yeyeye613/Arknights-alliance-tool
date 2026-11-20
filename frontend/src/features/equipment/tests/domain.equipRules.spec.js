/**
 * 装备规则测试
 *
 * 从 data/equipment.js 抽出规则后，这些用例只依赖 domain 层，
 * 不需要 mount 任何装备组件。
 */
import { describe, it, expect } from "vitest";
import { getGameVersion } from "@/data/versions.js";
import {
  EQUIPMENT_SLOT_COUNT,
  MORPH_EQUIPMENT,
  equipToOperator,
  getCombinedEquipments,
  getMorphCovenant,
  getOperatorEquipmentNames,
  hasEquipmentPool,
  removeOperatorEquipment,
  shouldConsumeFromStaging,
} from "@/features/equipment/domain/equipRules";

const guicheng = getGameVersion("guicheng");
const mengyue = getGameVersion("mengyue");

describe("getMorphCovenant", () => {
  it("携带变形同构体 + 对应装备时授予盟约", () => {
    expect(getMorphCovenant([MORPH_EQUIPMENT, "坚守盾牌"], guicheng)).toBe("坚守");
  });

  it("装备顺序不影响结果", () => {
    expect(getMorphCovenant(["炎国短刀", MORPH_EQUIPMENT], guicheng)).toBe("炎");
  });

  it("维式重锤整个系列都算", () => {
    expect(getMorphCovenant([MORPH_EQUIPMENT, "终极维式重锤"], guicheng)).toBe(
      "维多利亚",
    );
  });

  it("没有变形同构体时不生效", () => {
    expect(getMorphCovenant(["坚守盾牌"], guicheng)).toBe("");
  });

  it("只有变形同构体时不生效", () => {
    expect(getMorphCovenant([MORPH_EQUIPMENT], guicheng)).toBe("");
  });

  it("搭配件不是 morph 装备时不生效", () => {
    expect(getMorphCovenant([MORPH_EQUIPMENT, "源石溶剂"], guicheng)).toBe("");
  });

  it("盟约不属于当前版本时不生效", () => {
    // 盟约版没有装备池，任何 morph 组合都不成立
    expect(getMorphCovenant([MORPH_EQUIPMENT, "坚守盾牌"], mengyue)).toBe("");
  });

  it("空输入返回空串", () => {
    expect(getMorphCovenant(undefined, guicheng)).toBe("");
    expect(getMorphCovenant([], guicheng)).toBe("");
  });
});

describe("槽位与装配", () => {
  it("装备槽上限为 2", () => {
    expect(EQUIPMENT_SLOT_COUNT).toBe(2);
  });

  it("空槽会被过滤掉", () => {
    expect(getOperatorEquipmentNames({ equipments: ["", "坚守盾牌"] })).toEqual([
      "坚守盾牌",
    ]);
  });

  it("超出上限的多余装备被截断", () => {
    expect(
      getOperatorEquipmentNames({
        equipments: ["坚守盾牌", "炎国短刀", "奥术法阵"],
      }),
    ).toEqual(["坚守盾牌", "炎国短刀"]);
  });

  it("没有装备字段时返回空数组", () => {
    expect(getOperatorEquipmentNames({})).toEqual([]);
    expect(getOperatorEquipmentNames(null)).toEqual([]);
  });

  it("可以装备到空槽", () => {
    const result = equipToOperator({}, "坚守盾牌");
    expect(result).toEqual({ ok: true, equipments: ["坚守盾牌"] });
  });

  it("重复装备被拒绝", () => {
    const result = equipToOperator({ equipments: ["坚守盾牌"] }, "坚守盾牌");
    expect(result).toEqual({ ok: false, reason: "duplicated" });
  });

  it("槽位已满被拒绝", () => {
    const result = equipToOperator(
      { equipments: ["坚守盾牌", "炎国短刀"] },
      "奥术法阵",
    );
    expect(result).toEqual({ ok: false, reason: "full" });
  });

  it("空装备名被拒绝", () => {
    expect(equipToOperator({}, "")).toEqual({ ok: false, reason: "empty" });
  });

  it("按槽位下标卸下装备", () => {
    expect(
      removeOperatorEquipment({ equipments: ["坚守盾牌", "炎国短刀"] }, 0),
    ).toEqual(["炎国短刀"]);
    expect(
      removeOperatorEquipment({ equipments: ["坚守盾牌", "炎国短刀"] }, 1),
    ).toEqual(["坚守盾牌"]);
  });

  it("卸下不存在的槽位不会报错", () => {
    expect(removeOperatorEquipment({ equipments: ["坚守盾牌"] }, 5)).toEqual([
      "坚守盾牌",
    ]);
  });
});

describe("组合装与装备池", () => {
  it("凑齐组成件时识别出组合装", () => {
    const combos = getCombinedEquipments(["不退者之盾", "不退者力场"], guicheng);
    expect(combos.map((item) => item.name)).toEqual(["不退者卫护系统"]);
  });

  it("缺一件时不算组合装", () => {
    expect(getCombinedEquipments(["不退者之盾"], guicheng)).toEqual([]);
  });

  it("规程版有装备池，盟约版没有", () => {
    expect(hasEquipmentPool(guicheng)).toBe(true);
    expect(hasEquipmentPool(mengyue)).toBe(false);
    expect(hasEquipmentPool(undefined)).toBe(false);
  });

  it("只有从临时池装备成功才需要消耗该件", () => {
    expect(shouldConsumeFromStaging("staging")).toBe(true);
    expect(shouldConsumeFromStaging("pool")).toBe(false);
  });
});
