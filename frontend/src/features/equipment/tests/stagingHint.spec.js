import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import EquipmentStaging from "@/features/equipment/components/EquipmentStaging.vue";

/** canDrag 默认 true：有鼠标时才教人拖 */
const mountWith = (props) => mount(EquipmentStaging, { props });

describe("临时装备池的操作提示", () => {
  it("有鼠标：提示可以拖，也可以点选", () => {
    const wrapper = mountWith({ items: ["坚守盾牌"] });

    const hint = wrapper.find(".stage-hint").text();
    expect(hint).toContain("拖到");
    expect(hint).toContain("点");
    expect(wrapper.find(".stage-item").attributes("draggable")).toBe("true");
    wrapper.unmount();
  });

  it("触屏：不再提拖动，改为点装备再点干员", () => {
    const wrapper = mountWith({ items: ["坚守盾牌"], canDrag: false });

    const hint = wrapper.find(".stage-hint").text();
    expect(hint).not.toContain("拖");
    expect(hint).toContain("点编队干员");
    // 拖不动就不要让元素还挂着可拖状态
    expect(wrapper.find(".stage-item").attributes("draggable")).toBe("false");
    wrapper.unmount();
  });

  it("触屏空态同样不提拖动", () => {
    const wrapper = mountWith({ items: [], canDrag: false });

    const empty = wrapper.find(".stage-empty").text();
    expect(empty).not.toContain("拖");
    expect(empty).toContain("点编队干员");
    wrapper.unmount();
  });
});
