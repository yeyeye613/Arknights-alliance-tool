/**
 * 已保存编队面板的事件参数
 *
 * 合集内条目与未归类条目共用 TeamCard，但「在未分类列表里的位置」只有后者有。
 * 这条用例锁的是：合集内条目请求移动时第二个参数必须是 null，
 * 否则会把未分类列表里同序号的编队一起搬走。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";

import SavedTeamsPanel from "../components/SavedTeamsPanel.vue";

const TEAM_IN_COLLECTION = { name: "合集内的队", team: [], version: "mengyue" };
const TEAM_UNGROUPED = { name: "未归类队", team: [], version: "mengyue" };
const TEAM_BEFORE = { name: "排在前面的队", team: [], version: "mengyue" };

const mountPanel = () =>
  mount(SavedTeamsPanel, {
    props: {
      savedTeams: [TEAM_BEFORE, TEAM_UNGROUPED],
      teamCollections: [
        {
          name: "合集A",
          version: "mengyue",
          expanded: true,
          teams: [TEAM_IN_COLLECTION],
        },
      ],
      currentVersionId: "mengyue",
    },
  });

/** 「移动 / 删除 / 编辑」只在编辑模式下出现 */
const enterEditMode = async (wrapper) => {
  const button = wrapper
    .findAll("button")
    .find((item) => item.text().includes("编辑模式"));
  await button.trigger("click");
};

describe("SavedTeamsPanel 的移动事件", () => {
  beforeEach(() => {
    vi.stubGlobal("prompt", vi.fn(() => "新合集"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("合集内条目请求移动时，未分类索引为 null", async () => {
    const wrapper = mountPanel();
    await enterEditMode(wrapper);

    const collectionGroup = wrapper.findAll(".team-collection")[0];
    await collectionGroup.find(".move-btn").trigger("click");

    expect(wrapper.emitted("moveToCollection")[0]).toEqual([
      {
        teamItem: TEAM_IN_COLLECTION,
        fromCollectionName: "合集A",
        savedIndex: null,
        targetCollectionName: "新合集",
      },
    ]);
  });

  it("未归类条目请求移动时，带上它在列表里的真实索引", async () => {
    const wrapper = mountPanel();
    await enterEditMode(wrapper);

    const ungroupedGroup = wrapper.findAll(".team-collection")[1];
    await ungroupedGroup.findAll(".move-btn")[1].trigger("click");

    expect(wrapper.emitted("moveToCollection")[0]).toEqual([
      {
        teamItem: TEAM_UNGROUPED,
        fromCollectionName: null,
        savedIndex: 1,
        targetCollectionName: "新合集",
      },
    ]);
  });

  it("取消输入时不派发移动事件", async () => {
    vi.stubGlobal("prompt", vi.fn(() => ""));
    const wrapper = mountPanel();
    await enterEditMode(wrapper);

    const collectionGroup = wrapper.findAll(".team-collection")[0];
    await collectionGroup.find(".move-btn").trigger("click");

    expect(wrapper.emitted("moveToCollection")).toBeUndefined();
  });

  it("点击合集头派发 toggleCollection，只带合集名", async () => {
    const wrapper = mountPanel();

    await wrapper.findAll(".collection-header")[0].trigger("click");

    expect(wrapper.emitted("toggleCollection")[0]).toEqual(["合集A"]);
  });

  it("删除合集内编队时按合集名定位", async () => {
    const wrapper = mountPanel();
    await enterEditMode(wrapper);

    const collectionGroup = wrapper.findAll(".team-collection")[0];
    await collectionGroup.find(".delete-btn").trigger("click");

    expect(wrapper.emitted("deleteTeam")[0]).toEqual(["合集A", 0]);
  });
});
