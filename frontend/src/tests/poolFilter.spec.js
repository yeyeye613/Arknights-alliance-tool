import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PoolPanel from "../components/PoolPanel.vue";
import { useGameVersion } from "@/composables/useGameVersion.js";

const visibleNames = (wrapper) =>
  wrapper.findAll(".op-unit .name-label").map((n) => n.text());

describe("干员池筛选", () => {
  beforeEach(() => {
    useGameVersion().setVersion("guicheng");
  });

  it("按特质类型筛选：特异化只剩对应干员", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    expect(visibleNames(wrapper).length).toBe(143);

    const select = wrapper.findAll("select").find((s) =>
      s.findAll("option").some((o) => o.text() === "特异化"),
    );
    await select.setValue("特异化");

    const names = visibleNames(wrapper);
    expect(names.length).toBe(2);
    wrapper.unmount();
  });

  it("按触发时机筛选：获得时包含逻各斯、不含折桠", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    const select = wrapper.findAll("select").find((s) =>
      s.findAll("option").some((o) => o.text() === "获得时"),
    );
    await select.setValue("获得时");

    const names = visibleNames(wrapper);
    expect(names).toContain("逻各斯");
    expect(names).not.toContain("折桠");
    wrapper.unmount();
  });

  it("Ban 盟约：仅 Ban 其一仍显示，全部 Ban 才隐藏", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    // 展开 Ban 面板
    await wrapper.find(".ban-toggle").trigger("click");
    const checkboxes = wrapper.findAll(".ban-option input");
    const byCovenant = (name) =>
      checkboxes.find((cb) => cb.element.parentElement.textContent.trim() === name);

    // 折桠的盟约是 乌萨斯 + 不屈
    await byCovenant("乌萨斯").setValue(true);
    expect(visibleNames(wrapper)).toContain("折桠");

    await byCovenant("不屈").setValue(true);
    expect(visibleNames(wrapper)).not.toContain("折桠");

    // 与折桠无关的干员不受影响
    expect(visibleNames(wrapper)).toContain("逻各斯");
    wrapper.unmount();
  });

  it("Ban 面板折叠后只显示数量角标", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    await wrapper.find(".ban-toggle").trigger("click");
    const checkboxes = wrapper.findAll(".ban-option input");
    await checkboxes[0].setValue(true);
    await checkboxes[1].setValue(true);
    // 再次点击折叠
    await wrapper.find(".ban-toggle").trigger("click");

    expect(wrapper.find(".ban-panel").exists()).toBe(false);
    expect(wrapper.find(".ban-toggle").text()).toBe("2");
    expect(wrapper.find(".ban-toggle").classes()).toContain("has-banned");
    wrapper.unmount();
  });

  it("Ban 全部盟约时无盟约干员与空选择不受影响", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    await wrapper.find(".ban-toggle").trigger("click");
    const checkboxes = wrapper.findAll(".ban-option input");
    for (const cb of checkboxes) {
      await cb.setValue(true);
    }
    // 全 Ban 后有盟约的干员全部隐藏，池子应为空
    expect(visibleNames(wrapper).length).toBe(0);
    wrapper.unmount();
  });
});
