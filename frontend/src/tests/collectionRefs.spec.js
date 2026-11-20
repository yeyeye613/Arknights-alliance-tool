/**
 * 合集引用：用名字定位，不用数组下标
 *
 * 下标是「渲染位置」，合集一旦增删就会指向别人。这组用例锁的是
 * 「删除排在前面的合集后，后面合集的编队仍能正确编辑 / 删除 / 移动」。
 */
import { describe, it, expect, beforeEach } from "vitest";

import { useTeamStorage } from "../composables/useTeamStorage";

const team = (name) => ({ name, team: [], createTime: "" });

/** 建一个干净的存储实例并预置三个合集 */
const setup = () => {
  window.localStorage.clear();
  const storage = useTeamStorage();
  storage.initSavedTeams();

  storage.addOrUpdateTeam({
    newTeam: team("A1"),
    collectionName: "合集A",
    editingLocation: null,
  });
  storage.addOrUpdateTeam({
    newTeam: team("B1"),
    collectionName: "合集B",
    editingLocation: null,
  });
  storage.addOrUpdateTeam({
    newTeam: team("C1"),
    collectionName: "合集C",
    editingLocation: null,
  });
  return storage;
};

const namesOf = (storage) => storage.teamCollections.value.map((c) => c.name);

const collectionNamed = (storage, name) =>
  storage.teamCollections.value.find((c) => c.name === name);

describe("合集引用", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("删除排在前面的合集后，编辑后面合集的编队仍落在原合集", () => {
    const storage = setup();
    // 合集 A 被整组删除，B / C 的下标各前移一位
    storage.teamCollections.value.splice(0, 1);

    storage.addOrUpdateTeam({
      newTeam: team("C1-改"),
      collectionName: "合集C",
      editingLocation: { collectionName: "合集C", teamIndex: 0 },
    });

    expect(namesOf(storage)).toEqual(["合集B", "合集C"]);
    expect(collectionNamed(storage, "合集C").teams[0].name).toBe("C1-改");
    expect(collectionNamed(storage, "合集B").teams[0].name).toBe("B1");
    // 未分类列表不应该被动过
    expect(storage.savedTeams.value).toEqual([]);
  });

  it("按合集名删除编队，删除后合集为空会自动移除", () => {
    const storage = setup();

    storage.deleteTeam({ collectionName: "合集B", teamIndex: 0 });

    expect(namesOf(storage)).toEqual(["合集A", "合集C"]);
    expect(storage.savedTeams.value).toEqual([]);
  });

  it("把合集内的编队移到另一个合集，不影响未分类列表", () => {
    const storage = setup();
    storage.addOrUpdateTeam({
      newTeam: team("U1"),
      collectionName: "",
      editingLocation: null,
    });

    const movingTeam = collectionNamed(storage, "合集B").teams[0];
    // 合集内的编队在未分类列表里没有位置，调用方必须传 null
    storage.moveToCollection({
      teamItem: movingTeam,
      fromCollectionName: "合集B",
      savedIndex: null,
      targetCollectionName: "合集D",
    });

    expect(namesOf(storage)).toEqual(["合集A", "合集C", "合集D"]);
    expect(collectionNamed(storage, "合集D").teams[0].name).toBe("B1");
    expect(storage.savedTeams.value.map((item) => item.name)).toEqual(["U1"]);
  });

  it("保存弹窗按名字落库，第一个合集不会被当成「不归类」", () => {
    const storage = setup();

    storage.saveTeam(
      { name: "新队", team: [{ name: "能天使" }], collectionName: "合集A" },
      () => {},
      "mengyue",
    );

    expect(collectionNamed(storage, "合集A").teams.map((t) => t.name)).toEqual([
      "A1",
      "新队",
    ]);
    expect(storage.savedTeams.value).toEqual([]);
  });
});
