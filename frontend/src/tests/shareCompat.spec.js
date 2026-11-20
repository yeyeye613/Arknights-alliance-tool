/**
 * 分享码兼容性回归网
 *
 * 这是整个仓库唯一一条「协议级」测试：
 * - 下面的固定串是编码器当前输出的权威快照，码表顺序、Base62 表、
 *   字段写入顺序任何一处变动都会让它变红。
 * - 历史 ARKTEAM / ARKCOL 码用 pako 现场构造，覆盖旧格式的解析分支。
 *
 * 规矩（见 CONTRIBUTING）：码表只允许追加，快照串一旦上线就不能再变。
 * 如果本文件红了，先确认是「协议真的需要改」，否则应当修实现而不是改快照。
 */
import { describe, it, expect } from "vitest";
import pako from "pako";

import { encodeTeam, encodeCollection } from "@/features/sharing/domain/shareCodec.js";
import { useShareCode } from "@/features/sharing/composables/useShareCode.js";

/** 固定输入 → 固定输出，用于锁定 v3 编码行为 */
const FIXTURES = {
  plain: {
    data: { name: "测试队", team: [{ name: "卡达" }, { name: "慕斯" }] },
    versionId: "guicheng",
    code: "AOFnLLla4tjKW7cXYlavw3f7",
  },
  withEquipment: {
    data: {
      name: "装备队",
      team: [
        { name: "卡达", equipments: ["变形同构体", "坚守盾牌"] },
        { name: "慕斯" },
      ],
    },
    versionId: "guicheng",
    code: "A1z8S5l4byU7KSsZXsn8fvFuahj9ZQ",
  },
  mengyue: {
    data: { name: "盟约队", team: [{ name: "折桠" }, { name: "烈夏" }] },
    versionId: "mengyue",
    code: "A1c9DiGt2dIIZ8A6pPc5GMsPFB",
  },
};

const COLLECTION_FIXTURE = {
  data: {
    name: "合集甲",
    teams: [
      { name: "A", team: [{ name: "卡达" }] },
      { name: "B", team: [{ name: "慕斯" }] },
    ],
  },
  versionId: "guicheng",
  code: "AVQfs7LvhqzwrVH5jZgzurJ8dDX0dYw5",
};

/** 构造 v1/v2 历史码：ARKTEAM + base64(deflate(json)) */
const makeLegacyCode = (prefix, payload) => {
  const bytes = pako.deflate(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return prefix + btoa(binary);
};

describe("v3 分享码快照", () => {
  const { parseCode, importTeam } = useShareCode();

  it("编队码编码结果保持不变", () => {
    for (const fixture of Object.values(FIXTURES)) {
      expect(encodeTeam(fixture.data, fixture.versionId)).toBe(fixture.code);
    }
  });

  it("合集码编码结果保持不变", () => {
    expect(encodeCollection(COLLECTION_FIXTURE.data, COLLECTION_FIXTURE.versionId)).toBe(
      COLLECTION_FIXTURE.code,
    );
  });

  it("快照串可解码回原始数据", () => {
    const parsed = parseCode(FIXTURES.plain.code);
    expect(parsed.t).toBe("team");
    expect(parsed.type).toBe("team");
    expect(parsed.n).toBe("测试队");
    expect(parsed.g).toBe("guicheng");
    expect(parsed.ops).toEqual(["卡达", "慕斯"]);

    const imported = importTeam(parsed);
    expect(imported.team.map((op) => op.name)).toEqual(["卡达", "慕斯"]);
    expect(imported.version).toBe("guicheng");
  });

  it("带装备的快照串保留装备且不带多余字段", () => {
    const parsed = parseCode(FIXTURES.withEquipment.code);
    // 含装备的码里，没有装备的干员解出来是空数组（线格式统一，还原时会被剥掉）
    expect(parsed.ops).toEqual([
      { n: "卡达", e: ["变形同构体", "坚守盾牌"] },
      { n: "慕斯", e: [] },
    ]);

    const { importTeam: importer } = useShareCode();
    const imported = importer(parsed);
    expect(imported.team[0].equipments).toEqual(["变形同构体", "坚守盾牌"]);
    // 没装备的干员不应写出空数组，否则码会变长
    expect(imported.team[1].equipments).toBeUndefined();
  });

  it("合集快照串可解码", () => {
    const parsed = parseCode(COLLECTION_FIXTURE.code);
    expect(parsed.t).toBe("collection");
    expect(parsed.n).toBe("合集甲");
    expect(parsed.teams.map((team) => team.n)).toEqual(["A", "B"]);
  });

  it("长码被换行或带空格时仍能解析", () => {
    const messy = FIXTURES.withEquipment.code.replace(/(.{6})/g, "$1 \n");
    expect(parseCode(messy).n).toBe("装备队");
  });
});

describe("历史分享码兼容", () => {
  const { parseCode, importTeam, importCollection } = useShareCode();

  it("ARKTEAM v1 编队码", () => {
    const code = makeLegacyCode("ARKTEAM", {
      v: 1,
      t: "team",
      n: "旧版编队",
      ops: ["卡达", "慕斯"],
      g: "guicheng",
    });

    const parsed = parseCode(code);
    expect(parsed.v).toBe(1);
    expect(parsed.type).toBe("team");

    const imported = importTeam(parsed);
    expect(imported.name).toBe("旧版编队");
    expect(imported.version).toBe("guicheng");
  });

  it("ARKCOL v2 合集码", () => {
    const code = makeLegacyCode("ARKCOL", {
      v: 2,
      t: "collection",
      n: "旧版合集",
      teams: [
        { n: "一号队", ops: ["卡达"] },
        { n: "二号队", ops: ["慕斯", "卡达"] },
      ],
    });

    const parsed = parseCode(code);
    expect(parsed.type).toBe("collection");

    const imported = importCollection(parsed);
    expect(imported.name).toBe("旧版合集");
    expect(imported.teams).toHaveLength(2);
    expect(imported.teams[1].team.map((op) => op.name)).toEqual(["慕斯", "卡达"]);
  });

  it("旧码中的未知干员被跳过，不影响其余成员", () => {
    const code = makeLegacyCode("ARKTEAM", {
      v: 1,
      t: "team",
      n: "跨版本队",
      ops: ["卡达", "并不存在的干员"],
    });
    const imported = importTeam(parseCode(code));
    expect(imported.team.map((op) => op.name)).toEqual(["卡达"]);
  });

  it("全部干员都无效时报错", () => {
    const code = makeLegacyCode("ARKTEAM", {
      v: 1,
      t: "team",
      n: "空队",
      ops: ["并不存在的干员"],
    });
    expect(() => importTeam(parseCode(code))).toThrow("编队中没有有效干员");
  });

  it("不支持的旧版本号会被拒绝", () => {
    const code = makeLegacyCode("ARKTEAM", { v: 9, t: "team", n: "x", ops: [] });
    expect(() => parseCode(code)).toThrow("不支持的密语版本");
  });
});

describe("非法输入", () => {
  const { parseCode } = useShareCode();

  it("空码报错", () => {
    expect(() => parseCode("")).toThrow("密语不能为空");
    expect(() => parseCode("   ")).toThrow("密语不能为空");
    expect(() => parseCode(null)).toThrow("密语不能为空");
  });

  it("未知格式报错", () => {
    expect(() => parseCode("not-a-code")).toThrow("无效的密语格式");
  });

  it("损坏的历史码报错", () => {
    expect(() => parseCode("ARKTEAM这不是base64")).toThrow("分享码已损坏");
  });
});
