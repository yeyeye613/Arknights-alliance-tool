/**
 * 分享弹窗的状态契约
 *
 * 生成码为空时不能弹空窗——这条拒绝用返回值 + notify 表达，
 * composable 自己不碰任何浏览器对话框。
 */
import { describe, it, expect, vi } from "vitest";

import { useShareDialogs } from "@/features/sharing/composables/useShareDialogs.js";

describe("useShareDialogs", () => {
  it("空码不打开弹窗，返回 false 并提示", () => {
    const notify = vi.fn();
    const { showShareModal, openShareModal } = useShareDialogs(notify);

    expect(openShareModal("", null, "team")).toBe(false);
    expect(showShareModal.value).toBe(false);
    expect(notify).toHaveBeenCalledWith("生成分享码失败");
  });

  it("分享编队时清空合集预览，反之亦然", () => {
    const { currentShareTeam, currentShareCollection, openShareModal } =
      useShareDialogs();
    const team = { name: "编队" };
    const collection = { name: "合集" };

    openShareModal("CODE1", team, "team");
    expect(currentShareTeam.value).toEqual(team);
    expect(currentShareCollection.value).toBeNull();

    openShareModal("CODE2", collection, "collection");
    expect(currentShareTeam.value).toBeNull();
    expect(currentShareCollection.value).toEqual(collection);
  });

  it("关闭分享后清空码与预览", () => {
    const {
      showShareModal,
      shareCode,
      currentShareTeam,
      openShareModal,
      closeShareModal,
    } = useShareDialogs();

    openShareModal("CODE", { name: "编队" }, "team");
    closeShareModal();

    expect(showShareModal.value).toBe(false);
    expect(shareCode.value).toBe("");
    expect(currentShareTeam.value).toBeNull();
  });
});
