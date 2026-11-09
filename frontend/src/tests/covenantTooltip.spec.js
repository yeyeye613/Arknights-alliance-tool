import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import PoolPanel from "../components/PoolPanel.vue";
import CovenantsPanel from "../components/CovenantsPanel.vue";
import CovenantTooltip from "../components/CovenantTooltip.vue";
import { useGameVersion } from "@/composables/useGameVersion.js";
import { hideCovenantTooltip } from "@/composables/useCovenantTooltip.js";

// PoolPanel 不内嵌提示组件（App 挂载全局唯一实例），测试用宿主组合两者
const PoolHost = defineComponent({
  render: () => h("div", [h(PoolPanel), h(CovenantTooltip)]),
});

const tip = () => document.body.querySelector(".covenant-tooltip");

describe("盟约效果悬停提示", () => {
  beforeEach(() => {
    localStorage.clear();
    hideCovenantTooltip();
    document.body.innerHTML = "";
    useGameVersion().setVersion("guicheng");
  });

  afterEach(() => {
    hideCovenantTooltip();
  });

  it("干员池悬停阵营图标：展示该盟约的激活门槛与效果", async () => {
    const wrapper = mount(PoolHost);
    await nextTick();

    const wusasi = wrapper
      .findAll(".cov-icon")
      .find((btn) => btn.attributes("aria-label") === "乌萨斯" || btn.find("img").attributes("alt") === "乌萨斯");
    expect(wusasi).toBeTruthy();

    await wusasi.trigger("mouseenter");
    await nextTick();

    const el = tip();
    expect(el).toBeTruthy();
    expect(el.textContent).toContain("乌萨斯");
    expect(el.textContent).toContain("核心盟约");
    expect(el.textContent).toContain("激活 3 名");
    expect(el.textContent).toContain("基础效果");
    expect(el.textContent).toContain("生命值");
    expect(el.textContent).toContain("在场效果");
    expect(el.textContent).toContain("在场6名不同的【乌萨斯】干员");

    await wusasi.trigger("mouseleave");
    expect(tip()).toBeNull();
    wrapper.unmount();
  });

  it("编队盟约栏悬停：附带当前编队人数与进阶等级", async () => {
    const wrapper = mount(CovenantsPanel, {
      props: {
        presentCovList: ["乌萨斯"],
        presentCovCounts: { 乌萨斯: 4 },
        advancedCovLevels: { 乌萨斯: 2 },
      },
    });
    const tooltip = mount(CovenantTooltip);
    await nextTick();

    await wrapper.find(".cov-item").trigger("mouseenter");
    await nextTick();

    const el = tip();
    expect(el.textContent).toContain("乌萨斯");
    expect(el.textContent).toContain("编队 4 名");
    expect(el.textContent).toContain("进阶 Lv.2");
    wrapper.unmount();
    tooltip.unmount();
  });

  it("切换版本后展示对应版本的盟约效果文案", async () => {
    useGameVersion().setVersion("mengyue");
    const wrapper = mount(PoolHost);
    await nextTick();

    const yan = wrapper
      .findAll(".cov-icon")
      .find((btn) => btn.find("img").attributes("alt") === "炎");
    await yan.trigger("mouseenter");
    await nextTick();

    // 盟约版「炎」的基础效果描述与规程版不同
    expect(tip().textContent).toContain("炎佑");
    wrapper.unmount();
  });
});
