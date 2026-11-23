import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import EquipmentPool from "@/features/equipment/components/EquipmentPool.vue";
import { useGameVersion } from "@/features/game-version/composables/useGameVersion.js";
import { stubMediaQueries } from "@/tests/support/mediaQuery.js";

const isBodyHidden = (wrapper) =>
  (wrapper.find(".equip-body").attributes("style") || "").includes(
    "display: none",
  );

describe("装备池的折叠与提示", () => {
  beforeEach(() => {
    localStorage.clear();
    // 盟约版的装备池是空的，装备相关断言必须切到规程
    useGameVersion().setVersion("guicheng");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("窄屏：折叠条与装备数量一起出现，收起后列表隐藏", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(EquipmentPool);
    await nextTick();

    // 窄屏不再渲染原来的头部，避免出现两条「装备池」标题
    expect(wrapper.find(".equip-head").exists()).toBe(false);
    const bar = wrapper.find(".collapse-bar");
    expect(bar.exists()).toBe(true);
    expect(bar.find(".collapse-title").text()).toBe("装备池");
    // 装备列表非空才谈得上「数量一致」，否则 0 对 0 也能通过
    const cardCount = wrapper.findAll(".equip-card").length;
    expect(cardCount).toBeGreaterThan(0);
    expect(bar.find(".collapse-count").text()).toBe(String(cardCount));
    expect(isBodyHidden(wrapper)).toBe(false);

    await bar.trigger("click");
    expect(isBodyHidden(wrapper)).toBe(true);

    await bar.trigger("click");
    expect(isBodyHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("窄屏：待装备数量显示在折叠条上，收起后也看得见", async () => {
    stubMediaQueries({ narrow: true });
    const wrapper = mount(EquipmentPool, {
      props: { staged: ["坚守盾牌", "变形同构体"] },
    });
    await nextTick();

    await wrapper.find(".collapse-bar").trigger("click");

    expect(wrapper.find(".collapse-bar .equip-staged").text()).toContain("2");
    wrapper.unmount();
  });

  it("宽屏：渲染常规头部，不出现折叠条", async () => {
    stubMediaQueries({ narrow: false, fine: true });
    const wrapper = mount(EquipmentPool);
    await nextTick();

    expect(wrapper.find(".equip-head").exists()).toBe(true);
    expect(wrapper.find(".collapse-bar").exists()).toBe(false);
    expect(isBodyHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("从窄屏切回宽屏时自动展开", async () => {
    const viewport = stubMediaQueries({ narrow: true });
    const wrapper = mount(EquipmentPool);
    await nextTick();

    await wrapper.find(".collapse-bar").trigger("click");
    expect(isBodyHidden(wrapper)).toBe(true);

    viewport.setNarrow(false);
    await nextTick();
    expect(isBodyHidden(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it("有鼠标时提示可以拖，触屏只讲点选", async () => {
    stubMediaQueries({ narrow: false, fine: true });
    const desktop = mount(EquipmentPool);
    await nextTick();
    expect(desktop.find(".equip-hint").text()).toContain("拖");
    desktop.unmount();

    stubMediaQueries({ narrow: true });
    const phone = mount(EquipmentPool);
    await nextTick();
    const hint = phone.find(".equip-hint").text();
    expect(hint).not.toContain("拖");
    expect(hint).toContain("点击编队干员头像");
    // 触屏别挂着可拖状态，长按会抢走页面滚动
    expect(phone.find(".equip-card").attributes("draggable")).toBe("false");
    phone.unmount();
  });
});
