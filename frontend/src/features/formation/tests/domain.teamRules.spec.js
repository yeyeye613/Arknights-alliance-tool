/**
 * 编队规则测试
 *
 * 「缺省版本 = 盟约版」这条隐式规则原先散落在 5 个文件里，
 * 这里把它固定成一条断言。
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_VERSION_ID,
  getGameVersion,
} from "@/data/versions.js";
import {
  canAddToTeam,
  countMissingOperators,
  exceedsTeamLimit,
  isOperatorMissing,
  resolveTeamVersionId,
  truncateToLimit,
} from "@/features/formation/domain/teamRules";

const guicheng = getGameVersion("guicheng");
const mengyue = getGameVersion("mengyue");

describe("编队上限", () => {
  it("未满时可以加入", () => {
    expect(canAddToTeam(0, 8)).toBe(true);
    expect(canAddToTeam(7, 8)).toBe(true);
  });

  it("已满时不能加入", () => {
    expect(canAddToTeam(8, 8)).toBe(false);
    expect(canAddToTeam(9, 8)).toBe(false);
  });

  it("超出上限才需要截断", () => {
    const team = [1, 2, 3];
    expect(exceedsTeamLimit(team, 3)).toBe(false);
    expect(exceedsTeamLimit(team, 2)).toBe(true);
    expect(exceedsTeamLimit(null, 2)).toBe(false);
  });

  it("截断保留前 N 个且不改原数组", () => {
    const team = [1, 2, 3, 4];
    expect(truncateToLimit(team, 2)).toEqual([1, 2]);
    expect(team).toEqual([1, 2, 3, 4]);
  });
});

describe("跨版本干员", () => {
  it("当前版本没有的干员视为缺失", () => {
    // 拜松只存在于规程版
    expect(isOperatorMissing({ name: "拜松" }, mengyue)).toBe(true);
    expect(isOperatorMissing({ name: "拜松" }, guicheng)).toBe(false);
  });

  it("自选干员不算跨版本", () => {
    expect(
      isOperatorMissing({ name: "并不存在的干员", isSelfOperator: true }, guicheng),
    ).toBe(false);
  });

  it("统计编队中缺失的人数", () => {
    const team = [{ name: "拜松" }, { name: "卡达" }, { name: "折桠" }];
    expect(countMissingOperators(team, mengyue)).toBe(2);
    expect(countMissingOperators(team, guicheng)).toBe(0);
    expect(countMissingOperators([], guicheng)).toBe(0);
  });
});

describe("版本回退", () => {
  it("有版本时用版本自身", () => {
    expect(resolveTeamVersionId({ version: "guicheng" })).toBe("guicheng");
  });

  it("没有版本时回退到默认版本", () => {
    expect(resolveTeamVersionId({})).toBe(DEFAULT_VERSION_ID);
    expect(resolveTeamVersionId(null)).toBe(DEFAULT_VERSION_ID);
    expect(resolveTeamVersionId(undefined)).toBe(DEFAULT_VERSION_ID);
  });

  it("可以指定其他回退值", () => {
    expect(resolveTeamVersionId({}, "guicheng")).toBe("guicheng");
  });
});
