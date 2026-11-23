import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PoolPanel from "@/features/roster/components/PoolPanel.vue";
import { useGameVersion } from "@/features/game-version/composables/useGameVersion.js";
import { hideTraitTooltip } from "@/features/roster/composables/useTraitTooltip.js";
import { stubMediaQueries } from "@/tests/support/mediaQuery.js";

/**
 * 交互方式只看「有没有鼠标」，不看宽度：
 * 触屏即使排成两列也拖不准，仍按点按处理。
 */
const firstCard = (wrapper) => wrapper.findAll(".op-unit")[0];

const addedCount = (wrapper) => (wrapper.emitted("addToTeam") || []).length;

describe("干员池的点击与双击", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameVersion().setVersion("guicheng");
  });

  afterEach(() => {
    hideTraitTooltip();
    vi.unstubAllGlobals();
  });

  it("触屏：第一次点击只展示详情，不入队", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    await firstCard(wrapper).trigger("click");

    expect(addedCount(wrapper)).toBe(0);
    wrapper.unmount();
  });

  it("触屏：连续两次点击才加入编队", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    const card = firstCard(wrapper);
    await card.trigger("click");
    await card.trigger("click");

    expect(addedCount(wrapper)).toBe(1);
    wrapper.unmount();
  });

  it("触屏：单击后换一名干员不算双击", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    const cards = wrapper.findAll(".op-unit");
    await cards[0].trigger("click");
    await cards[1].trigger("click");

    expect(addedCount(wrapper)).toBe(0);
    wrapper.unmount();
  });

  it("触屏：展示操作提示，折叠后隐藏", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    expect(wrapper.find(".pool-tap-hint").text()).toContain("双击");
    await wrapper.find(".collapse-bar").trigger("click");
    expect(wrapper.find(".pool-tap-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("有鼠标：单击直接加入，且不显示点按提示", async () => {
    stubMediaQueries({ narrow: false, fine: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    await firstCard(wrapper).trigger("click");

    expect(addedCount(wrapper)).toBe(1);
    expect(wrapper.find(".pool-tap-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("触屏但双列：仍按点按处理", async () => {
    stubMediaQueries({ narrow: false, fine: false });
    const wrapper = mount(PoolPanel);
    await nextTick();

    await firstCard(wrapper).trigger("click");

    expect(addedCount(wrapper)).toBe(0);
    expect(wrapper.find(".pool-tap-hint").exists()).toBe(true);
    wrapper.unmount();
  });

  it("有鼠标但单列：拖拽可用，单击仍直接加入", async () => {
    stubMediaQueries({ narrow: true, fine: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    await firstCard(wrapper).trigger("click");

    expect(addedCount(wrapper)).toBe(1);
    expect(wrapper.find(".pool-tap-hint").exists()).toBe(false);
    wrapper.unmount();
  });
});
