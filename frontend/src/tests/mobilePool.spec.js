import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PoolPanel from "../components/PoolPanel.vue";
import { useGameVersion } from "@/composables/useGameVersion.js";
import { getGameVersion } from "@/data/versions.js";

/**
 * 与 PoolPanel.vue 的 MOBILE_QUERY、以及样式里的媒体查询保持一致。
 * 之前这里写成 768px 且桩忽略入参，导致「测试永远通过、实现早已改坏」，
 * 现在桩只在查询串完全匹配时才返回 matches。
 */
const MOBILE_QUERY = "(max-width: 1024px)";

/** 构造可控的 matchMedia 桩，用于模拟移动端视口 */
const stubMatchMedia = (matches) => {
  const listeners = new Set();
  const mobileQueryList = {
    media: MOBILE_QUERY,
    matches,
    addEventListener: (type, handler) => {
      if (type === "change") listeners.add(handler);
    },
    removeEventListener: (type, handler) => {
      if (type === "change") listeners.delete(handler);
    },
    /** 模拟视口跨断点 */
    emit(nextMatches) {
      mobileQueryList.matches = nextMatches;
      listeners.forEach((handler) => handler({ matches: nextMatches }));
    },
  };

  const matchMedia = vi.fn((query) =>
    query === MOBILE_QUERY
      ? mobileQueryList
      : {
          media: query,
          matches: false,
          addEventListener() {},
          removeEventListener() {},
        },
  );

  vi.stubGlobal("matchMedia", matchMedia);
  return mobileQueryList;
};

const isPoolHidden = (wrapper) =>
  (wrapper.find(".drag-area").attributes("style") || "").includes(
    "display: none",
  );

/** 当前版本的干员总数，避免数据更新后测试假红 */
const totalOperators = () =>
  Object.keys(getGameVersion("guicheng").operators).length;

describe("小屏干员池折叠", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameVersion().setVersion("guicheng");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("组件查询的断点与样式保持一致", async () => {
    stubMatchMedia(true);
    const wrapper = mount(PoolPanel);
    await nextTick();

    expect(window.matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
    wrapper.unmount();
  });

  it("移动端：点击折叠条收起干员列表，再次点击展开", async () => {
    stubMatchMedia(true);
    const wrapper = mount(PoolPanel);
    await nextTick();

    expect(wrapper.find(".pool-toggle").exists()).toBe(true);
    expect(isPoolHidden(wrapper)).toBe(false);

    await wrapper.find(".pool-toggle").trigger("click");
    expect(isPoolHidden(wrapper)).toBe(true);
    // 折叠后仍能看到干员数量，避免误以为池子空了
    expect(wrapper.find(".pool-toggle-count").text()).toBe(
      String(totalOperators()),
    );
    expect(wrapper.find(".pool-toggle").classes()).toContain("collapsed");

    await wrapper.find(".pool-toggle").trigger("click");
    expect(isPoolHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("桌面端：折叠条不改变列表显示", async () => {
    stubMatchMedia(false);
    const wrapper = mount(PoolPanel);
    await nextTick();

    await wrapper.find(".pool-toggle").trigger("click");
    expect(isPoolHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("从移动端切回桌面端时自动展开", async () => {
    const mql = stubMatchMedia(true);
    const wrapper = mount(PoolPanel);
    await nextTick();

    await wrapper.find(".pool-toggle").trigger("click");
    expect(isPoolHidden(wrapper)).toBe(true);

    mql.emit(false);
    await nextTick();
    expect(isPoolHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });
});
