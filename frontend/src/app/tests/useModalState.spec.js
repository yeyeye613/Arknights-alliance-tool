/**
 * 弹窗状态的返回值契约
 *
 * 「空编队不能保存」这条规则留在 composable（它知道编队是否为空），
 * 但提示文案归视图层：这里断言 openSaveTeamModal 用返回值表达拒绝，
 * 而不是自己弹 alert（jsdom 下调用 alert 会直接报错）。
 */
import { describe, it, expect } from "vitest";

import { useModalState } from "@/app/useModalState.js";

describe("useModalState", () => {
  it("空编队不打开保存弹窗，返回 false", () => {
    const { showTeamModal, openSaveTeamModal } = useModalState();

    expect(openSaveTeamModal([])).toBe(false);
    expect(showTeamModal.value).toBe(false);
  });

  it("非空编队打开保存弹窗，返回 true", () => {
    const { showTeamModal, teamName, openSaveTeamModal } = useModalState();

    expect(openSaveTeamModal([{ name: "能天使" }])).toBe(true);
    expect(showTeamModal.value).toBe(true);
    expect(teamName.value).toBe("");
  });

  it("重新打开时清掉上一次的编辑态", () => {
    const { editingTeam, editingLocation, openSaveTeamModal, editTeam } =
      useModalState();

    editTeam({ name: "旧编队" }, 0, 1);
    expect(editingTeam.value).toEqual({ name: "旧编队" });

    openSaveTeamModal([{ name: "能天使" }]);
    expect(editingTeam.value).toBeNull();
    expect(editingLocation.value).toBeNull();
  });
});
