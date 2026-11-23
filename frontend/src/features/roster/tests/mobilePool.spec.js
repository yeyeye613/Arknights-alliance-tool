import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PoolPanel from "@/features/roster/components/PoolPanel.vue";
import { useGameVersion } from "@/features/game-version/composables/useGameVersion.js";
import { getGameVersion } from "@/data/versions.js";
import { NARROW_QUERY } from "@/shared/composables/useNarrowViewport.js";
import { stubMediaQueries } from "@/tests/support/mediaQuery.js";

/**
 * 断点直接取实现的常量，不再手抄一份。
 * 之前这里写成 768px 且桩忽略入参，导致「测试永远通过、实现早已改坏」。
 */
const isPoolHidden = (wrapper) =>
  (wrapper.find(".drag-area").attributes("style") || "").includes(
    "display: none",
  );

/** 当前版本的干员总数，避免数据更新后测试假红 */
const totalOperators = () =>
  Object.keys(getGameVersion("guicheng").operators).length;

describe("窄屏干员池折叠", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameVersion().setVersion("guicheng");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("组件查询的断点与样式保持一致", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    expect(window.matchMedia).toHaveBeenCalledWith(NARROW_QUERY);
    wrapper.unmount();
  });

  it("窄屏：点击折叠条收起干员列表，再次点击展开", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    expect(wrapper.find(".collapse-bar").exists()).toBe(true);
    expect(isPoolHidden(wrapper)).toBe(false);

    await wrapper.find(".collapse-bar").trigger("click");
    expect(isPoolHidden(wrapper)).toBe(true);
    // 折叠后仍能看到干员数量，避免误以为池子空了
    expect(wrapper.find(".collapse-count").text()).toBe(
      String(totalOperators()),
    );
    expect(wrapper.find(".collapse-bar").classes()).toContain("collapsed");

    await wrapper.find(".collapse-bar").trigger("click");
    expect(isPoolHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("宽屏：不渲染折叠条，列表始终显示", async () => {
    stubMediaQueries({ narrow: false, fine: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    expect(wrapper.find(".collapse-bar").exists()).toBe(false);
    expect(isPoolHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("从窄屏切回宽屏时列表自动展开", async () => {
    const viewport = stubMediaQueries({ narrow: true });
    const wrapper = mount(PoolPanel);
    await nextTick();

    await wrapper.find(".collapse-bar").trigger("click");
    expect(isPoolHidden(wrapper)).toBe(true);

    viewport.setNarrow(false);
    await nextTick();
    expect(isPoolHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });
});
