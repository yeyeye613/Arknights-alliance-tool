/**
 * 盟约统计纯函数测试
 *
 * 这些用例不 mount 任何组件、也不依赖全局版本单例，
 * 全部显式传版本数据 —— 这是 P1 拆分的主要收益。
 */
import { describe, it, expect } from "vitest";
import { getGameVersion } from "../data/versions.js";
import {
  applyHarmonyBonus,
  computeCovenantStats,
  countBaseCovenants,
  countMorphCovenants,
  getActivatedCovList,
  getAdvancedCovLevels,
  getAdvancedThresholds,
  getSortedCovenants,
} from "../domain/covenantStats";
import { MORPH_EQUIPMENT } from "../domain/equipRules";

const mengyue = getGameVersion("mengyue");
const guicheng = getGameVersion("guicheng");

describe("countBaseCovenants", () => {
  it("同名干员重复出现只计一次", () => {
    const counts = countBaseCovenants(
      [{ name: "号角" }, { name: "号角" }],
      mengyue,
    );
    expect(counts["维多利亚"]).toBe(1);
  });

  it("同时接受字符串与对象两种编队元素", () => {
    const counts = countBaseCovenants(["号角", { name: "风笛" }], mengyue);
    expect(counts["维多利亚"]).toBe(2);
  });

  it("忽略空元素与没有名字的项", () => {
    const counts = countBaseCovenants([null, {}, { name: "" }], mengyue);
    expect(counts).toEqual({});
  });

  it("空编队返回空对象", () => {
    expect(countBaseCovenants([], mengyue)).toEqual({});
    expect(countBaseCovenants(undefined, mengyue)).toEqual({});
  });
});

describe("countMorphCovenants", () => {
  it("变形同构体贡献的人数单独统计", () => {
    const team = [
      { name: "卡达", equipments: [MORPH_EQUIPMENT, "坚守盾牌"] },
      { name: "慕斯" },
    ];
    expect(countMorphCovenants(team, guicheng).坚守).toBe(1);
  });

  it("没有装备时为空", () => {
    expect(countMorphCovenants([{ name: "卡达" }], guicheng)).toEqual({});
  });
});

describe("applyHarmonyBonus", () => {
  const covenants = mengyue.covenants;

  it("调和未激活时不加成", () => {
    const counts = applyHarmonyBonus({ 维多利亚: 2 }, covenants);
    expect(counts["维多利亚"]).toBe(2);
  });

  it("调和激活后已出现的核心盟约 +1", () => {
    const counts = applyHarmonyBonus(
      { 调和: 1, 维多利亚: 2, 炎: 1 },
      covenants,
    );
    expect(counts["维多利亚"]).toBe(3);
    expect(counts["炎"]).toBe(2);
  });

  it("未出现的核心盟约不会被加成出来", () => {
    const counts = applyHarmonyBonus({ 调和: 1, 维多利亚: 2 }, covenants);
    expect(counts["炎"]).toBeUndefined();
  });

  it("附加盟约不受调和影响", () => {
    const counts = applyHarmonyBonus({ 调和: 1, 不屈: 2 }, covenants);
    expect(counts["不屈"]).toBe(2);
  });

  it("只加一层，不基于加成结果递归", () => {
    const counts = applyHarmonyBonus(
      { 调和: 1, 维多利亚: 2 },
      covenants,
    );
    // 2 + 1 = 3；若实现递归会变成 4
    expect(counts["维多利亚"]).toBe(3);
  });

  it("不修改传入的统计对象", () => {
    const base = { 调和: 1, 维多利亚: 2 };
    applyHarmonyBonus(base, covenants);
    expect(base["维多利亚"]).toBe(2);
  });
});

describe("进阶阈值与等级", () => {
  it("从效果文案解析「在场N名不同」阈值并升序去重", () => {
    // 「炎」的两条进阶效果分别为 6 名与 9 名
    expect(getAdvancedThresholds("炎", mengyue.covenants)).toEqual([6, 9]);
  });

  it("没有进阶效果的盟约返回空阈值", () => {
    expect(getAdvancedThresholds("调和", mengyue.covenants)).toEqual([]);
  });

  it("达到第一个阈值解锁 1 级", () => {
    const levels = getAdvancedCovLevels({ 炎: 6 }, mengyue.covenants);
    expect(levels["炎"]).toBe(1);
  });

  it("未达阈值不解锁", () => {
    const levels = getAdvancedCovLevels({ 炎: 5 }, mengyue.covenants);
    expect(levels["炎"]).toBe(0);
  });

  it("达到两个阈值解锁 2 级", () => {
    const levels = getAdvancedCovLevels({ 炎: 9 }, mengyue.covenants);
    expect(levels["炎"]).toBe(2);
  });
});

describe("激活列表与排序", () => {
  it("只有达到激活人数才进入激活列表", () => {
    const active = getActivatedCovList({ 炎: 3, 维多利亚: 2 }, mengyue.covenants);
    expect(active.map((cov) => cov.name)).toEqual(["炎"]);
  });

  it("激活列表带上原始配置", () => {
    const [first] = getActivatedCovList({ 炎: 3 }, mengyue.covenants);
    expect(first.name).toBe("炎");
    expect(first.activateCount).toBe(3);
    expect(Array.isArray(first.effects)).toBe(true);
  });

  it("排序时激活的盟约排在前面", () => {
    // 「炎」需要 3 人、「不屈」需要 2 人：同为 2 人时只有不屈激活。
    // 用相对顺序断言，避免依赖数组排序的稳定性实现细节。
    const sorted = getSortedCovenants({ 炎: 2, 不屈: 2 }, mengyue.covenants);
    const active = sorted.indexOf("不屈");
    const inactive = sorted.indexOf("炎");
    expect(active).toBeGreaterThanOrEqual(0);
    expect(inactive).toBeGreaterThan(active);
  });

  it("全部未激活时保持原始顺序", () => {
    expect(getSortedCovenants({ 炎: 1, 维多利亚: 1 }, mengyue.covenants)).toEqual([
      "炎",
      "维多利亚",
    ]);
  });
});

describe("computeCovenantStats", () => {
  it("一次返回全部切片，且差异只在调和加成", () => {
    const team = [
      { name: "盟约·辅助干员" },
      { name: "号角" },
      { name: "风笛" },
    ];
    const stats = computeCovenantStats(team, mengyue);

    expect(stats.baseCounts["维多利亚"]).toBe(2);
    expect(stats.counts["维多利亚"]).toBe(3);
    expect(stats.activeList.map((cov) => cov.name)).toContain("维多利亚");
    expect(stats.presentList).toContain("维多利亚");
    // 调和 1 人即激活（activateCount = 1），两个盟约都在列表里
    expect(stats.activeList.map((cov) => cov.name)).toContain("调和");
    expect(stats.morphCounts).toEqual({});
    expect(stats.advancedLevels["维多利亚"]).toBe(0);
  });

  it("装备加成计入人数，并单独记录来源供界面标注", () => {
    const team = [{ name: "卡达", equipments: [MORPH_EQUIPMENT, "坚守盾牌"] }];
    const stats = computeCovenantStats(team, guicheng);

    expect(stats.baseCounts.坚守).toBe(1);
    expect(stats.morphCounts.坚守).toBe(1);
    expect(stats.counts.坚守).toBe(1);
  });
});
