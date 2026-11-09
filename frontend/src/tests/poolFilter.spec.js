import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PoolPanel from "../components/PoolPanel.vue";
import { useGameVersion } from "@/composables/useGameVersion.js";

const visibleNames = (wrapper) =>
  wrapper.findAll(".op-unit .name-label").map((n) => n.text());

const findChip = (wrapper, text) =>
  wrapper.findAll("button.chip").find((c) => c.text().trim() === text);

const findBanIcon = (wrapper, name) =>
  wrapper.findAll(".ban-icon").find((b) => b.find(".ban-name").text() === name);

describe("干员池筛选", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameVersion().setVersion("guicheng");
  });

  it("按特质类型筛选：特异化只剩对应干员", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    expect(visibleNames(wrapper).length).toBe(143);

    await findChip(wrapper, "特异化").trigger("click");

    const names = visibleNames(wrapper);
    expect(names.length).toBe(2);
    // 再次点击取消筛选
    await findChip(wrapper, "特异化").trigger("click");
    expect(visibleNames(wrapper).length).toBe(143);
    wrapper.unmount();
  });

  it("按触发时机筛选：获得时包含逻各斯、不含折桠", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    await findChip(wrapper, "获得时").trigger("click");

    const names = visibleNames(wrapper);
    expect(names).toContain("逻各斯");
    expect(names).not.toContain("折桠");
    wrapper.unmount();
  });

  it("阶数筛选：点击Ⅲ阶只显示Ⅲ阶干员", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    await findChip(wrapper, "Ⅲ").trigger("click");
    const names = visibleNames(wrapper);
    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain("逻各斯");
    wrapper.unmount();
  });

  it("图标 / 文字视图可切换，两种方式都能筛选", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    // 默认图标模式：阵营为图标按钮
    expect(wrapper.findAll(".cov-icon").length).toBeGreaterThan(0);
    expect(findChip(wrapper, "乌萨斯")).toBeUndefined();

    // 切到文字模式
    const textBtn = wrapper
      .findAll(".view-btn")
      .find((b) => b.text() === "文字");
    await textBtn.trigger("click");
    expect(wrapper.findAll(".cov-icon").length).toBe(0);
    expect(wrapper.text()).toContain("乌萨斯");

    // 文字模式下点击筛选生效
    await findChip(wrapper, "乌萨斯").trigger("click");
    const names = visibleNames(wrapper);
    expect(names.length).toBeGreaterThan(0);
    expect(names.length).toBeLessThan(143);
    expect(names).toContain("折桠");
    wrapper.unmount();
  });

  it("筛选区可折叠：折叠后隐藏条件行、保留搜索与已选摘要", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    await findChip(wrapper, "特异化").trigger("click");
    await wrapper.find(".collapse-btn").trigger("click");

    expect(wrapper.find(".filter-body").isVisible()).toBe(false);
    expect(wrapper.find(".search-input").exists()).toBe(true);
    // 已选条件摘要仍在，避免折叠后不知道筛选还生效
    expect(wrapper.findAll(".active-chip").length).toBe(1);
    expect(visibleNames(wrapper).length).toBe(2);

    await wrapper.find(".collapse-btn").trigger("click");
    await nextTick();
    // jsdom 的 getComputedStyle 有缓存，isVisible 在恢复显示后会误报，这里直接看行内样式
    expect(wrapper.find(".filter-body").attributes("style") || "").not.toContain(
      "display: none",
    );
    expect(wrapper.findAll(".cov-icon").length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it("Ban 盟约：仅 Ban 其一仍显示，全部 Ban 才隐藏", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    // 展开 Ban 区块
    await wrapper.find(".ban-header").trigger("click");
    expect(wrapper.find(".ban-body").isVisible()).toBe(true);
    expect(wrapper.findAll(".ban-icon").length).toBe(26);

    // 折桠的盟约是 乌萨斯 + 不屈
    await findBanIcon(wrapper, "乌萨斯").trigger("click");
    expect(visibleNames(wrapper)).toContain("折桠");

    await findBanIcon(wrapper, "不屈").trigger("click");
    expect(visibleNames(wrapper)).not.toContain("折桠");

    // 与折桠无关的干员不受影响
    expect(visibleNames(wrapper)).toContain("逻各斯");
    wrapper.unmount();
  });

  it("Ban 区块折叠后只显示数量角标", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    await wrapper.find(".ban-header").trigger("click");
    await findBanIcon(wrapper, "乌萨斯").trigger("click");
    await findBanIcon(wrapper, "不屈").trigger("click");
    // 再次点击折叠
    await wrapper.find(".ban-header").trigger("click");

    expect(wrapper.find(".ban-body").isVisible()).toBe(false);
    expect(wrapper.find(".ban-badge").text()).toBe("2");
    expect(wrapper.find(".ban-section").classes()).toContain("has-banned");
    wrapper.unmount();
  });

  it("Ban 全部盟约时池子清空", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();

    await wrapper.find(".ban-header").trigger("click");
    const icons = wrapper.findAll(".ban-icon");
    for (const icon of icons) {
      await icon.trigger("click");
    }
    expect(visibleNames(wrapper).length).toBe(0);
    wrapper.unmount();
  });
});
