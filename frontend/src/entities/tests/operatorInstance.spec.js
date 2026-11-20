/**
 * 干员实例形状契约（D3）
 *
 * 五个构造点（版本池、自选池、自选弹窗、分享码导入、以及自选干员的读档
 * 归一）统一走 createOperatorInstance，字段集合必须完全一致——改前各处
 * 只填自己关心的字段，`tier` 有的地方没有、`equipments` 有的是 undefined。
 *
 * 另锁 key 方案：干员池允许同名共存（版本池与自选池有 12 个名字重叠），
 * 所以身份由「来源 + 名字」决定，不能只用名字。
 */
import { describe, it, expect } from "vitest";

import { createOperatorInstance, operatorKey } from "@/entities/operator";

describe("createOperatorInstance", () => {
  it("只给名字时补出最小合法形状", () => {
    const op = createOperatorInstance({ name: "卡达" });

    expect(op.name).toBe("卡达");
    expect(op.tier).toBeUndefined();
    expect(op.isSelfOperator).toBeUndefined();
    expect(op.equipments).toEqual([]);
  });

  it("字段集合固定，不随入参增减", () => {
    const minimal = Object.keys(createOperatorInstance({ name: "卡达" })).sort();
    const full = Object.keys(
      createOperatorInstance({
        name: "白铁",
        tier: "Ⅵ",
        isSelfOperator: true,
        equipments: ["坚守盾牌"],
      }),
    ).sort();

    expect(full).toEqual(minimal);
    expect(minimal).toEqual(["equipments", "isSelfOperator", "name", "tier"]);
  });

  it("不再产出 avatar 与 id（派生值只在渲染时算）", () => {
    const op = createOperatorInstance({ name: "卡达", tier: "Ⅴ" });

    expect("avatar" in op).toBe(false);
    expect("id" in op).toBe(false);
  });

  it("过滤空装备槽，空字符串不占位", () => {
    const op = createOperatorInstance({
      name: "卡达",
      equipments: ["", "坚守盾牌"],
    });

    expect(op.equipments).toEqual(["坚守盾牌"]);
  });
});

describe("operatorKey", () => {
  it("同名不同来源产出不同 key", () => {
    const fromPool = operatorKey({ name: "星熊" });
    const fromSelf = operatorKey({ name: "星熊", isSelfOperator: true });

    expect(fromPool).toBe("星熊");
    expect(fromSelf).toBe("self:星熊");
    expect(fromPool).not.toBe(fromSelf);
  });

  it("池子里同名干员共存时不撞 key", () => {
    const pool = [
      createOperatorInstance({ name: "星熊" }),
      createOperatorInstance({ name: "星熊", isSelfOperator: true }),
      createOperatorInstance({ name: "卡达" }),
    ];

    const keys = pool.map(operatorKey);
    expect(new Set(keys).size).toBe(pool.length);
  });
});
