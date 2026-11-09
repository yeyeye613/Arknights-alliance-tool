import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import PoolPanel from "../components/PoolPanel.vue";
import TraitTooltip from "../components/TraitTooltip.vue";

// PoolPanel 不再内嵌 TraitTooltip（App 挂载全局唯一实例），测试用宿主组合两者
const Host = defineComponent({
  render: () => h("div", [h(PoolPanel), h(TraitTooltip)]),
});
import { useGameVersion } from "@/composables/useGameVersion.js";
import {
  showTraitTooltip,
  hideTraitTooltip,
} from "@/composables/useTraitTooltip.js";

describe("特质悬停提示", () => {
  beforeEach(() => {
    hideTraitTooltip();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    hideTraitTooltip();
  });

  it("规程版本：悬停折桠显示盟约、乌萨斯特质与进阶后文本", async () => {
    useGameVersion().setVersion("guicheng");
    const wrapper = mount(Host);
    await nextTick();

    const zheya = wrapper
      .findAll(".op-unit")
      .find((u) => u.text().includes("折桠"));
    expect(zheya).toBeTruthy();
    await zheya.trigger("mouseenter");

    const tip = document.body.querySelector(".trait-tooltip");
    expect(tip).toBeTruthy();
    expect(tip.textContent).toContain("折桠");
    // 干员自身盟约以标签展示
    const covTags = [...tip.querySelectorAll(".covenant-tag")].map((el) =>
      el.textContent.trim(),
    );
    expect(covTags).toEqual(["乌萨斯", "不屈"]);
    expect(tip.textContent).toContain("持续叠加");
    expect(tip.textContent).toContain("进入休整期时");
    expect(tip.textContent).toContain("转化2层【乌萨斯】临时层数为固定层数");
    expect(tip.textContent).toContain("进阶后");
    expect(tip.textContent).toContain("转化4层【乌萨斯】临时层数为固定层数");
    wrapper.unmount();
  });

  it("无特质数据的自选干员显示占位文案", async () => {
    const host = mount(TraitTooltip);
    showTraitTooltip(
      { clientX: 10, clientY: 10 },
      "陈",
      [],
      "",
      ["炎"],
    );
    await nextTick();
    const tip = document.body.querySelector(".trait-tooltip");
    expect(tip.textContent).toContain("暂无特质数据");
    // 无特质但仍展示所属盟约
    expect(tip.querySelector(".covenant-tag").textContent.trim()).toBe("炎");
    host.unmount();
  });

  it("盟约版本：特质含 trigger 与 upgraded 字段", async () => {
    useGameVersion().setVersion("mengyue");
    const wrapper = mount(Host);
    await nextTick();

    const anyUnit = wrapper.findAll(".op-unit")[0];
    await anyUnit.trigger("mouseenter");
    await nextTick();
    const tip = document.body.querySelector(".trait-tooltip");
    expect(tip).toBeTruthy();
    expect(tip.textContent).toContain("作战能力");
    wrapper.unmount();
  });
});
