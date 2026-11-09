import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PoolPanel from "../components/PoolPanel.vue";
import { useGameVersion } from "@/composables/useGameVersion.js";

/** 构造可控的 matchMedia 桩，用于模拟移动端视口 */
const stubMatchMedia = (matches) => {
  const listeners = new Set();
  const mql = {
    matches,
    media: "(max-width: 768px)",
    addEventListener: (type, handler) => {
      if (type === "change") listeners.add(handler);
    },
    removeEventListener: (type, handler) => {
      if (type === "change") listeners.delete(handler);
    },
    /** 模拟视口跨断点 */
    emit(nextMatches) {
      mql.matches = nextMatches;
      listeners.forEach((handler) => handler({ matches: nextMatches }));
    },
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));
  return mql;
};

const isPoolHidden = (wrapper) =>
  (wrapper.find(".drag-area").attributes("style") || "").includes(
    "display: none",
  );

describe("小屏干员池折叠", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameVersion().setVersion("guicheng");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    expect(wrapper.find(".pool-toggle-count").text()).toBe("143");
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
