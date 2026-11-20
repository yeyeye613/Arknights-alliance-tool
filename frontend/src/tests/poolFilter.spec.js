import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PoolPanel from "../components/PoolPanel.vue";
import { useGameVersion } from "@/composables/useGameVersion.js";
import {
  CORE_GROUP,
  ADDITIONAL_GROUP,
  getCovenantsByGroup,
  getGameVersion,
} from "@/data/versions.js";

/** 规程版干员总数：由数据推导，赛季扩池时测试不会假红 */
const TOTAL = () => Object.keys(getGameVersion("guicheng").operators).length;
/** 规程版可 Ban 的盟约总数（核心 + 附加） */
const TOTAL_COVENANTS = () => {
  const version = getGameVersion("guicheng");
  return (
    getCovenantsByGroup(version, CORE_GROUP).length +
    getCovenantsByGroup(version, ADDITIONAL_GROUP).length
  );
};

const visibleNames = (wrapper) =>
  wrapper.findAll(".op-unit .name-label").map((n) => n.text());

const findChip = (wrapper, text) =>
  wrapper.findAll("button.chip").find((c) => c.text().trim() === text);

const toTextView = async (wrapper) => {
  const textBtn = wrapper
    .findAll(".view-btn")
    .find((b) => b.text() === "文字");
  await textBtn.trigger("click");
};

/** 盟约三态：点一下筛选、再点一下 Ban */
const banViaChip = async (wrapper, name) => {
  let chip = findChip(wrapper, name);
  await chip.trigger("click");
  chip = findChip(wrapper, name);
  await chip.trigger("click");
};

describe("干员池筛选", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameVersion().setVersion("guicheng");
  });

  it("按特质类型筛选：特异化只剩对应干员", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    expect(visibleNames(wrapper).length).toBe(TOTAL());

    await findChip(wrapper, "特异化").trigger("click");

    const names = visibleNames(wrapper);
    expect(names.length).toBe(2);
    // 再次点击取消筛选
    await findChip(wrapper, "特异化").trigger("click");
    expect(visibleNames(wrapper).length).toBe(TOTAL());
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
    expect(names.length).toBeLessThan(TOTAL());
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

  it("盟约三态：点一下筛选、再点一下 Ban、第三下取消", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    await toTextView(wrapper);

    // 点一下：按盟约筛选（不屈为附加盟约）
    let chip = findChip(wrapper, "不屈");
    await chip.trigger("click");
    expect(chip.classes()).toContain("active");
    expect(visibleNames(wrapper).length).toBeLessThan(TOTAL());
    expect(visibleNames(wrapper)).toContain("折桠");

    // 再点一下：转为 Ban，筛选状态清除
    chip = findChip(wrapper, "不屈");
    await chip.trigger("click");
    chip = findChip(wrapper, "不屈");
    expect(chip.classes()).toContain("banned");
    expect(chip.classes()).not.toContain("active");
    // 仅 Ban 盟约其一：折桠（乌萨斯+不屈）仍显示；只有不屈的宴/风丸被隐藏
    expect(visibleNames(wrapper)).toContain("折桠");
    expect(visibleNames(wrapper)).not.toContain("宴");
    expect(visibleNames(wrapper)).not.toContain("风丸");

    // 第三下：取消 Ban，池子恢复
    chip = findChip(wrapper, "不屈");
    await chip.trigger("click");
    chip = findChip(wrapper, "不屈");
    expect(chip.classes()).not.toContain("banned");
    expect(visibleNames(wrapper).length).toBe(TOTAL());
    wrapper.unmount();
  });

  it("规程 Ban 阵营：带该阵营的干员全部隐藏", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    await toTextView(wrapper);

    // 折桠的盟约是 乌萨斯（阵营）+ 不屈；Ban 阵营即整阵营隐藏
    await banViaChip(wrapper, "乌萨斯");
    expect(visibleNames(wrapper)).not.toContain("折桠");

    // 无乌萨斯阵营的干员不受影响
    expect(visibleNames(wrapper)).toContain("逻各斯");
    wrapper.unmount();
  });

  it("规程 Ban 盟约：全部盟约被 Ban 才隐藏", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    await toTextView(wrapper);

    // Ban 附加盟约不屈：折桠（乌萨斯+不屈）仍显示
    await banViaChip(wrapper, "不屈");
    expect(visibleNames(wrapper)).toContain("折桠");
    // 只有不屈的干员被隐藏
    expect(visibleNames(wrapper)).not.toContain("宴");

    // 加上乌萨斯也 Ban 后，折桠全部盟约被 Ban 才隐藏
    await banViaChip(wrapper, "乌萨斯");
    expect(visibleNames(wrapper)).not.toContain("折桠");
    wrapper.unmount();
  });

  it("已筛摘要逐条显示 Ban 项并可逐条取消", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    await toTextView(wrapper);

    await banViaChip(wrapper, "乌萨斯");
    await banViaChip(wrapper, "不屈");

    const labels = wrapper.findAll(".active-chip").map((c) => c.text());
    expect(labels.some((t) => t.includes("乌萨斯"))).toBe(true);
    expect(labels.some((t) => t.includes("不屈"))).toBe(true);

    // 逐条取消：解禁乌萨斯后折桠（不屈仍 Ban）恢复显示
    const chip = wrapper
      .findAll(".active-chip")
      .find((c) => c.text().includes("乌萨斯"));
    await chip.trigger("click");
    expect(visibleNames(wrapper)).toContain("折桠");
    wrapper.unmount();
  });

  it("Ban 全部盟约时池子清空", async () => {
    const wrapper = mount(PoolPanel);
    await nextTick();
    await toTextView(wrapper);

    // 阵营 + 盟约两行的全部按钮逐个双击 Ban
    const covRows = wrapper
      .findAll(".icon-filter-row")
      .filter((row) => {
        const label = row.find(".row-label").text();
        return label === "阵营" || label === "盟约";
      });
    const names = covRows.flatMap((row) =>
      row.findAll("button.chip").map((chip) => chip.text().trim()),
    );
    expect(names.length).toBe(TOTAL_COVENANTS());
    for (const name of names) {
      await banViaChip(wrapper, name);
    }
    expect(visibleNames(wrapper).length).toBe(0);
    wrapper.unmount();
  });
});
