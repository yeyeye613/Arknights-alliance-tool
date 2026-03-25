import { describe, it, expect } from "vitest";
import { useShareCode } from "../composables/useShareCode";

describe("useShareCode composable", () => {
  const {
    generateTeamCode,
    generateCollectionCode,
    parseCode,
    importTeam,
    importCollection,
  } = useShareCode();

  it("should encode and decode team share code", () => {
    const teamData = {
      name: "测试队",
      team: [{ id: 1, name: "干员1", avatar: "a" }],
    };
    const code = generateTeamCode(teamData);
    expect(code.startsWith("ARKTEAM")).toBe(true);

    const data = parseCode(code);
    expect(data.t).toBe("team");
    expect(data.n).toBe("测试队");
    expect(data.ops).toEqual(["干员1"]);
  });

  it("should encode and decode collection share code", () => {
    const collection = {
      name: "合集",
      teams: [{ name: "队1", team: [{ id: 1, name: "干员1", avatar: "a" }] }],
    };
    const code = generateCollectionCode(collection);
    expect(code.startsWith("ARKCOL")).toBe(true);

    const data = parseCode(code);
    expect(data.t).toBe("collection");
    expect(data.n).toBe("合集");
    expect(data.teams[0].n).toBe("队1");
    expect(data.teams[0].ops).toEqual(["干员1"]);
  });

  it("should import team content from parsed code", () => {
    const parsed = { t: "team", n: "测试队", ops: ["隐现"] };
    const imported = importTeam(parsed);
    expect(imported.name).toBe("测试队");
    expect(imported.team.length).toBe(1);
    expect(imported.team[0].name).toBe("隐现");
  });

  it("should import collection content from parsed code", () => {
    const parsed = {
      t: "collection",
      n: "合集",
      teams: [{ n: "队1", ops: ["隐现"] }],
    };
    const imported = importCollection(parsed);
    expect(imported.name).toBe("合集");
    expect(imported.teams[0].name).toBe("队1");
    expect(imported.teams[0].team[0].name).toBe("隐现");
  });

  it("should reject empty code", () => {
    expect(() => parseCode("")).toThrow("密语不能为空");
  });

  it("should reject invalid prefix code", () => {
    expect(() => parseCode("INVALID")).toThrow("无效的密语格式");
  });
});
