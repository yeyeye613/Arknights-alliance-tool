/**
 * 存档兼容性：仓储读写的契约
 *
 * 这些用例锁的是「老用户的存档必须能原样读出来」：
 * - 键名是契约，用例里保留字面量，不引用 STORAGE_KEYS（引用常量就测不出改名）
 * - 编队字段逐字一致，不因为过一层仓储就多出 / 少掉字段
 * - expanded 只在内存里存在，落库时必须剥离
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  loadCollections,
  loadTeams,
  saveCollections,
  saveTeams,
  toPersistedCollection,
} from "@/infrastructure/storage/teamsRepository";

/** 早期版本写下的存档：编队没有 version 字段，合集带 expanded */
const LEGACY_TEAMS = [
  {
    name: "老队伍",
    team: [
      { name: "能天使", tier: "Ⅵ", avatar: "/resource/image/能天使.png" },
      { name: "夜刀", tier: "Ⅵ" },
    ],
    createTime: "2025/1/2 03:04:05",
  },
];

const LEGACY_COLLECTIONS = [
  {
    name: "旧合集",
    version: "mengyue",
    expanded: false,
    teams: [
      {
        name: "合集里的队",
        team: [{ name: "银灰", tier: "Ⅵ" }],
        createTime: "2025/1/2 03:04:05",
        version: "mengyue",
      },
    ],
  },
];

describe("存档仓储", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("读取旧存档时编队逐字一致", () => {
    window.localStorage.setItem(
      "arknights_saved_teams",
      JSON.stringify(LEGACY_TEAMS),
    );

    expect(loadTeams()).toEqual(LEGACY_TEAMS);
  });

  it("读取合集时把 expanded 重置为 true，其余字段不变", () => {
    window.localStorage.setItem(
      "arknights_team_collections",
      JSON.stringify(LEGACY_COLLECTIONS),
    );

    const [collection] = loadCollections();
    expect(collection.expanded).toBe(true);
    expect(collection.name).toBe("旧合集");
    expect(collection.version).toBe("mengyue");
    expect(collection.teams).toEqual(LEGACY_COLLECTIONS[0].teams);
  });

  it("落库时剥离 expanded，写入的键名保持不变", () => {
    saveCollections(LEGACY_COLLECTIONS);

    const raw = window.localStorage.getItem("arknights_team_collections");
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw);
    expect(persisted[0]).not.toHaveProperty("expanded");
    expect(persisted[0]).toEqual({
      name: "旧合集",
      version: "mengyue",
      teams: LEGACY_COLLECTIONS[0].teams,
    });
  });

  it("保存编队写入的键名与值保持不变", () => {
    saveTeams(LEGACY_TEAMS);

    const raw = window.localStorage.getItem("arknights_saved_teams");
    expect(JSON.parse(raw)).toEqual(LEGACY_TEAMS);
  });

  it("存档损坏时回退为空数组，不抛错", () => {
    // 损坏的存档会打印告警，这里静音以免污染测试输出
    vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem("arknights_saved_teams", "{ 不是 JSON");
    window.localStorage.setItem("arknights_team_collections", "null");

    expect(loadTeams()).toEqual([]);
    expect(loadCollections()).toEqual([]);
  });

  it("存档是合法 JSON 但不是数组时同样回退", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem("arknights_saved_teams", '{"name":"被改坏了"}');
    window.localStorage.setItem("arknights_team_collections", '"字符串"');

    expect(loadTeams()).toEqual([]);
    expect(loadCollections()).toEqual([]);
  });

  it("内存对象上的 expanded 不会影响原始数据", () => {
    const collection = { ...LEGACY_COLLECTIONS[0] };
    const persisted = toPersistedCollection(collection);

    expect(persisted).not.toHaveProperty("expanded");
    expect(collection.expanded).toBe(false);
  });
});
