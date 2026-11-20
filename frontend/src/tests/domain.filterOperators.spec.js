/**
 * 干员池筛选与 Ban 判定测试
 *
 * Ban 的两种策略（faction / covenant）过去埋在 PoolPanel 的模板组件里，
 * 只能靠 mount 组件 + 点击按钮间接验证；现在直接测纯函数。
 */
import { describe, it, expect } from "vitest";
import { getGameVersion } from "../data/versions.js";
import {
  EMPTY_POOL_FILTER,
  collectTraitOptions,
  filterOperators,
  isBannedByCovenants,
  resolveTier,
} from "../domain/filterOperators";
import {
  ADDITIONAL_GROUP,
  CORE_GROUP,
  getCovenantsByGroup,
} from "../domain/versionAdapter";

const guicheng = getGameVersion("guicheng");
const mengyue = getGameVersion("mengyue");

/** 用真实数据构造干员池，形状与 PoolPanel 里的 operatorPool 一致 */
const poolOf = (version) =>
  Object.keys(version.operators).map((name, index) => ({
    id: index,
    name,
  }));

const CORE_COVENANTS = getCovenantsByGroup(guicheng, CORE_GROUP);
const NO_BAN = { banned: [], coreCovenants: CORE_COVENANTS };

const names = (list) => list.map((op) => op.name);

describe("isBannedByCovenants", () => {
  it("没有 Ban 项时不会命中", () => {
    expect(isBannedByCovenants(["乌萨斯"], NO_BAN)).toBe(false);
  });

  it("干员没有任何盟约时不会命中", () => {
    expect(
      isBannedByCovenants([], { banned: ["乌萨斯"], coreCovenants: CORE_COVENANTS }),
    ).toBe(false);
  });

  it("covenant 策略：全部盟约被 Ban 才隐藏", () => {
    const ban = { banned: ["乌萨斯"], coreCovenants: CORE_COVENANTS };
    // 折桠是「乌萨斯 + 不屈」，只 Ban 一个还留着不屈
    expect(isBannedByCovenants(["乌萨斯", "不屈"], ban)).toBe(false);
    expect(isBannedByCovenants(["乌萨斯"], ban)).toBe(true);
  });

  it("faction 策略：Ban 核心盟约即整阵营隐藏", () => {
    const ban = {
      banned: ["乌萨斯"],
      strategy: "faction",
      coreCovenants: CORE_COVENANTS,
    };
    expect(isBannedByCovenants(["乌萨斯", "不屈"], ban)).toBe(true);
  });

  it("faction 策略：附加盟约仍按全体被 Ban 才隐藏", () => {
    const ban = {
      banned: ["不屈"],
      strategy: "faction",
      coreCovenants: CORE_COVENANTS,
    };
    // 不屈不是核心盟约，单 Ban 它不影响「乌萨斯 + 不屈」的干员
    expect(isBannedByCovenants(["乌萨斯", "不屈"], ban)).toBe(false);
    expect(isBannedByCovenants(["不屈"], ban)).toBe(true);
  });

  it("盟约版缺省为 covenant 策略", () => {
    expect(mengyue.banStrategy).toBeUndefined();
    expect(guicheng.banStrategy).toBe("faction");
  });
});

describe("resolveTier", () => {
  it("实例自带 tier 时优先（自选干员）", () => {
    expect(resolveTier({ name: "卡达", tier: "Ⅵ" }, guicheng)).toBe("Ⅵ");
  });

  it("没有 tier 时回退到版本数据", () => {
    expect(resolveTier({ name: "卡达" }, guicheng)).toBe("Ⅰ");
  });

  it("未知干员返回空串", () => {
    expect(resolveTier({ name: "并不存在的干员" }, guicheng)).toBe("");
    expect(resolveTier(null, guicheng)).toBe("");
  });
});

describe("filterOperators", () => {
  const pool = poolOf(guicheng);

  it("空条件返回整个干员池", () => {
    expect(filterOperators(pool, EMPTY_POOL_FILTER, NO_BAN, guicheng)).toHaveLength(
      pool.length,
    );
  });

  it("按名字搜索", () => {
    const result = filterOperators(
      pool,
      { ...EMPTY_POOL_FILTER, query: "卡达" },
      NO_BAN,
      guicheng,
    );
    expect(names(result)).toEqual(["卡达"]);
  });

  it("按阶数筛选", () => {
    const result = filterOperators(
      pool,
      { ...EMPTY_POOL_FILTER, tier: "Ⅲ" },
      NO_BAN,
      guicheng,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((op) => resolveTier(op, guicheng) === "Ⅲ")).toBe(true);
  });

  it("按核心盟约筛选", () => {
    const result = filterOperators(
      pool,
      { ...EMPTY_POOL_FILTER, mainCovenant: "乌萨斯" },
      NO_BAN,
      guicheng,
    );
    expect(names(result)).toContain("折桠");
    expect(names(result)).not.toContain("逻各斯");
  });

  it("按附加盟约筛选", () => {
    const result = filterOperators(
      pool,
      { ...EMPTY_POOL_FILTER, subCovenant: "不屈" },
      NO_BAN,
      guicheng,
    );
    expect(names(result)).toContain("折桠");
    expect(names(result)).toContain("宴");
  });

  it("按特质类型筛选", () => {
    const result = filterOperators(
      pool,
      { ...EMPTY_POOL_FILTER, traitType: "特异化" },
      NO_BAN,
      guicheng,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(pool.length);
  });

  it("按特质触发时机筛选", () => {
    const result = filterOperators(
      pool,
      { ...EMPTY_POOL_FILTER, traitTrigger: "获得时" },
      NO_BAN,
      guicheng,
    );
    expect(names(result)).toContain("逻各斯");
    expect(names(result)).not.toContain("折桠");
  });

  it("多个条件同时生效（与关系）", () => {
    const result = filterOperators(
      pool,
      { ...EMPTY_POOL_FILTER, traitType: "特异化", tier: "Ⅰ" },
      NO_BAN,
      guicheng,
    );
    expect(result.every((op) => resolveTier(op, guicheng) === "Ⅰ")).toBe(true);
  });

  it("数据中不存在的干员不会出现在结果里", () => {
    const result = filterOperators(
      [{ name: "并不存在的干员" }],
      EMPTY_POOL_FILTER,
      NO_BAN,
      guicheng,
    );
    expect(result).toEqual([]);
  });

  it("faction 策略下 Ban 阵营会隐藏整个阵营的干员", () => {
    const ban = {
      banned: ["乌萨斯"],
      strategy: "faction",
      coreCovenants: CORE_COVENANTS,
    };
    const result = names(filterOperators(pool, EMPTY_POOL_FILTER, ban, guicheng));
    // 折桠的乌萨斯+不屈都不能让它留下
    expect(result).not.toContain("折桠");
    expect(result).toContain("逻各斯");
  });

  it("covenant 策略下需要 Ban 掉全部盟约才隐藏", () => {
    const onlySub = names(
      filterOperators(
        pool,
        EMPTY_POOL_FILTER,
        { banned: ["不屈"], coreCovenants: CORE_COVENANTS },
        guicheng,
      ),
    );
    expect(onlySub).toContain("折桠");

    const both = names(
      filterOperators(
        pool,
        EMPTY_POOL_FILTER,
        { banned: ["不屈", "乌萨斯"], coreCovenants: CORE_COVENANTS },
        guicheng,
      ),
    );
    expect(both).not.toContain("折桠");
  });

  it("不修改传入的干员池", () => {
    const snapshot = pool.slice();
    filterOperators(pool, { ...EMPTY_POOL_FILTER, query: "卡达" }, NO_BAN, guicheng);
    expect(pool).toEqual(snapshot);
  });
});

describe("collectTraitOptions", () => {
  it("收集当前版本出现过的特质类型（去重）", () => {
    const types = collectTraitOptions(guicheng, "type");
    expect(types).toContain("特异化");
    expect(new Set(types).size).toBe(types.length);
  });

  it("收集触发时机", () => {
    expect(collectTraitOptions(guicheng, "trigger")).toContain("获得时");
  });

  it("版本没有干员时返回空数组", () => {
    expect(collectTraitOptions({ operators: {} }, "type")).toEqual([]);
  });
});

describe("附加盟约分组", () => {
  it("不屈属于附加盟约，乌萨斯属于核心盟约", () => {
    const additional = getCovenantsByGroup(guicheng, ADDITIONAL_GROUP);
    expect(additional).toContain("不屈");
    expect(CORE_COVENANTS).toContain("乌萨斯");
  });
});
