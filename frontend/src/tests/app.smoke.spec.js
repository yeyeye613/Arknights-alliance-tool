import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../App.vue";

describe("App 冒烟测试", () => {
  it("渲染标题与版本切换按钮，并能切换版本", async () => {
    const wrapper = mount(App, { attachTo: document.body });
    expect(wrapper.text()).toContain("卫戍协议练功房");
    expect(wrapper.text()).toContain("卫戍协议：盟约");
    expect(wrapper.text()).toContain("卫戍协议·规程");

    const guichengBtn = wrapper
      .findAll(".version-btn")
      .find((btn) => btn.text().includes("规程"));
    await guichengBtn.trigger("click");

    expect(wrapper.find(".version-btn.active").text()).toContain("规程");
    // 规程版本干员池 143 人
    const names = wrapper.findAll(".op-unit .name-label").map((n) => n.text());
    expect(names.length).toBe(143);
    expect(names).toContain("拜松");

    // 选中干员后盟约栏按规程数据渲染
    await wrapper.find(".search-input").setValue("拜松");
    await wrapper.find(".pool-grid .op-unit").trigger("click");

    const covNames = wrapper.findAll(".cov-item").map((item) => item.text());
    expect(covNames.join(" ")).toContain("炎");
    wrapper.unmount();
  });
});
