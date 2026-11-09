import { describe, it, expect } from "vitest";
import pako from "pako";
import { useShareCode } from "../composables/useShareCode";
import { getCodebook } from "../utils/shareCodec";

/** 造一个真实长度的编队：12 名干员 + 4 个汉字的队名 */
function makeTeam(name = "测试编队") {
  const names = getCodebook().slice(0, 12);
  return {
    name,
    team: names.map((opName, index) => ({
      id: index,
      name: opName,
      avatar: "a",
    })),
  };
}

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
    expect(code.startsWith("A")).toBe(true);

    const data = parseCode(code);
    expect(data.v).toBe(3);
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
    expect(code.startsWith("A")).toBe(true);

    const data = parseCode(code);
    expect(data.v).toBe(3);
    expect(data.t).toBe("collection");
    expect(data.n).toBe("合集");
    expect(data.teams[0].n).toBe("队1");
    expect(data.teams[0].ops).toEqual(["干员1"]);
  });

  it("should keep a 12-operator team under 60 characters", () => {
    const team = makeTeam();
    const code = generateTeamCode(team);
    expect(code.length).toBeLessThan(60);

    const parsed = parseCode(code);
    expect(parsed.ops).toEqual(team.team.map((op) => op.name));
  });

  it("should keep collection codes much shorter than the legacy format", () => {
    const collection = {
      name: "合集",
      teams: Array.from({ length: 6 }, (_, i) => ({
        ...makeTeam(`编队${i + 1}`),
      })),
    };
    const code = generateCollectionCode(collection);
    const legacy = `ARKCOL${btoa(
      String.fromCharCode(
        ...pako.deflate(
          JSON.stringify({
            v: 2,
            t: "collection",
            n: collection.name,
            teams: collection.teams.map((t) => ({
              n: t.name,
              ops: t.team.map((op) => ({ n: op.name, t: "", s: 0 })),
            })),
          }),
          { level: 9 },
        ),
      ),
    )}`;

    expect(code.length).toBeLessThan(legacy.length / 2);
    expect(parseCode(code).teams).toHaveLength(6);
  });

  it("should tolerate whitespace inside pasted codes", () => {
    const code = generateTeamCode(makeTeam());
    const wrapped = `${code.slice(0, 20)}\n  ${code.slice(20)}`;
    expect(parseCode(wrapped).ops).toHaveLength(12);
  });

  it("should still decode legacy ARKTEAM codes", () => {
    const legacy =
      "ARKTEAM" +
      btoa(
        String.fromCharCode(
          ...pako.deflate(
            JSON.stringify({ v: 2, t: "team", n: "旧队", ops: ["隐现"] }),
            { level: 9 },
          ),
        ),
      );
    const data = parseCode(legacy);
    expect(data.v).toBe(2);
    expect(data.n).toBe("旧队");
    expect(data.ops).toEqual(["隐现"]);
    expect(importTeam(data).team[0].name).toBe("隐现");
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

  it("should import self operator content from parsed code", () => {
    const parsed = { t: "team", n: "自选队", ops: ["白铁"] };
    const imported = importTeam(parsed);
    expect(imported.name).toBe("自选队");
    expect(imported.team.length).toBe(1);
    expect(imported.team[0].name).toBe("白铁");
    expect(imported.team[0].isSelfOperator).toBe(true);
  });

  it("should preserve self operator tier in share code", () => {
    const teamData = {
      name: "自选分享队",
      team: [
        { id: 1, name: "白铁", avatar: "a", tier: "Ⅵ", isSelfOperator: true },
      ],
    };

    const code = generateTeamCode(teamData);
    const parsed = parseCode(code);
    const imported = importTeam(parsed);

    expect(parsed.ops).toEqual([{ n: "白铁", t: "Ⅵ", s: 1 }]);
    expect(imported.team[0].name).toBe("白铁");
    expect(imported.team[0].tier).toBe("Ⅵ");
    expect(imported.team[0].isSelfOperator).toBe(true);
  });

  it("should carry the game version through the code", () => {
    const code = generateTeamCode(makeTeam(), "guicheng");
    expect(parseCode(code).g).toBe("guicheng");
  });

  it("should reject empty code", () => {
    expect(() => parseCode("")).toThrow("密语不能为空");
  });

  it("should reject invalid prefix code", () => {
    expect(() => parseCode("INVALID")).toThrow("无效的密语格式");
  });
});
