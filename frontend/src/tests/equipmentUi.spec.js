import { describe, it, expect, beforeEach } from "vitest";
import { ref, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import TeamPanel from "../components/TeamPanel.vue";
import EquipmentPool from "../components/EquipmentPool.vue";
import EquipmentStaging from "../components/EquipmentStaging.vue";
import CovenantsPanel from "../components/CovenantsPanel.vue";
import App from "../App.vue";
import { useGameVersion } from "../composables/useGameVersion.js";
import { EQUIPMENT_DRAG_TYPE } from "../composables/useEquipmentDrag.js";
import { useCovenantStats } from "../composables/useCovenantStats.js";

/** jsdom 没有 DataTransfer，做个最小实现 */
const createDataTransfer = () => {
  const store = {};
  return {
    effectAllowed: "",
    dropEffect: "",
    setData(type, value) {
      store[type] = String(value);
    },
    getData(type) {
      return store[type] || "";
    },
    get types() {
      return Object.keys(store);
    },
  };
};

const dragPayload = (name, from = "pool") =>
  JSON.stringify({ name, from });

describe("装备角标", () => {
  beforeEach(() => {
    useGameVersion().setVersion("guicheng");
  });

  const mountTeam = (team) =>
    mount(TeamPanel, { props: { team, teamLimit: 8 } });

  it("should hide slot when nothing equipped", () => {
    const wrapper = mountTeam([{ name: "卡达", avatar: "" }]);
    expect(wrapper.findAll(".equip-badge")).toHaveLength(0);
    expect(wrapper.find(".equip-badges").exists()).toBe(false);
  });

  it("should show one badge per equipped item", () => {
    const wrapper = mountTeam([
      { name: "卡达", avatar: "", equipments: ["坚守盾牌", "变形同构体"] },
    ]);
    const badges = wrapper.findAll(".equip-badge");
    expect(badges).toHaveLength(2);
    expect(badges[0].attributes("title")).toContain("坚守盾牌");
  });

  it("should remove equipment when clicking a badge", async () => {
    const wrapper = mountTeam([
      { name: "卡达", avatar: "", equipments: ["坚守盾牌", "变形同构体"] },
    ]);
    await wrapper.findAll(".equip-badge")[0].trigger("click");

    const emitted = wrapper.emitted("update:team").at(-1)[0];
    expect(emitted[0].equipments).toEqual(["变形同构体"]);
    expect(wrapper.emitted("notify").at(-1)[0]).toContain("坚守盾牌");
  });

  it("should equip when dropping equipment onto an operator", async () => {
    const wrapper = mountTeam([{ name: "卡达", avatar: "" }]);
    const dataTransfer = createDataTransfer();
    dataTransfer.setData(EQUIPMENT_DRAG_TYPE, dragPayload("坚守盾牌"));

    await wrapper.find(".op-unit").trigger("drop", { dataTransfer });

    const emitted = wrapper.emitted("update:team").at(-1)[0];
    expect(emitted[0].equipments).toEqual(["坚守盾牌"]);
    expect(wrapper.emitted("equipment-equipped").at(-1)[0]).toMatchObject({
      name: "坚守盾牌",
      source: "pool",
      operatorName: "卡达",
    });
  });

  it("should ignore operator drags that only carry text/plain", async () => {
    const wrapper = mountTeam([{ name: "卡达", avatar: "" }]);
    const dataTransfer = createDataTransfer();
    // 模拟干员排序拖拽（Sortable 只写 text/plain）
    dataTransfer.setData("text/plain", "卡达");

    await wrapper
      .find(".op-unit")
      .trigger("dragover", { dataTransfer });
    expect(wrapper.find(".drag-over").exists()).toBe(false);

    await wrapper.find(".op-unit").trigger("drop", { dataTransfer });

    expect(wrapper.emitted("update:team")).toBeFalsy();
    expect(wrapper.emitted("notify")).toBeFalsy();
  });

  it("should highlight the drop target only for equipment drags", async () => {
    const wrapper = mountTeam([{ name: "卡达", avatar: "" }]);

    const opDrag = createDataTransfer();
    opDrag.setData("text/plain", "卡达");
    await wrapper.find(".op-unit").trigger("dragover", { dataTransfer: opDrag });
    expect(wrapper.find(".op-unit.drag-over").exists()).toBe(false);

    const equipDrag = createDataTransfer();
    equipDrag.setData(EQUIPMENT_DRAG_TYPE, dragPayload("坚守盾牌"));
    await wrapper
      .find(".op-unit")
      .trigger("dragover", { dataTransfer: equipDrag });
    expect(wrapper.find(".op-unit.drag-over").exists()).toBe(true);
  });

  it("should reject a third equipment and keep two", async () => {
    const wrapper = mountTeam([
      { name: "卡达", avatar: "", equipments: ["坚守盾牌", "变形同构体"] },
    ]);
    const dataTransfer = createDataTransfer();
    dataTransfer.setData(EQUIPMENT_DRAG_TYPE, dragPayload("炎国短刀"));

    await wrapper.find(".op-unit").trigger("drop", { dataTransfer });

    expect(wrapper.emitted("update:team")).toBeFalsy();
    expect(wrapper.emitted("notify").at(-1)[0]).toContain("装备槽已满");
  });

  it("should equip the selected equipment when clicking the avatar", async () => {
    const wrapper = mount(TeamPanel, {
      props: {
        team: [{ name: "卡达", avatar: "" }],
        teamLimit: 8,
        selectedEquipment: "坚守盾牌",
      },
    });

    await wrapper.find(".img-container").trigger("click");

    const emitted = wrapper.emitted("update:team").at(-1)[0];
    expect(emitted[0].equipments).toEqual(["坚守盾牌"]);
  });
});

describe("装备池面板", () => {
  beforeEach(() => {
    useGameVersion().setVersion("guicheng");
  });

  it("should list the whole equipment pool", () => {
    const wrapper = mount(EquipmentPool);
    expect(wrapper.findAll(".equip-card")).toHaveLength(70);
    expect(wrapper.text()).toContain("装备池");
  });

  it("should emit stage event on click", async () => {
    const wrapper = mount(EquipmentPool);
    const card = wrapper
      .findAll(".equip-card")
      .find((item) => item.text().includes("坚守盾牌"));
    await card.trigger("click");
    expect(wrapper.emitted("stage")[0]).toEqual(["坚守盾牌"]);
  });

  it("should put drag payload on dataTransfer", async () => {
    const wrapper = mount(EquipmentPool);
    const dataTransfer = createDataTransfer();
    const card = wrapper
      .findAll(".equip-card")
      .find((item) => item.text().includes("炎国短刀"));

    await card.trigger("dragstart", { dataTransfer });

    const payload = JSON.parse(dataTransfer.getData(EQUIPMENT_DRAG_TYPE));
    expect(payload).toEqual({ name: "炎国短刀", from: "pool" });
  });

  it("should filter by keyword and tier", async () => {
    const wrapper = mount(EquipmentPool);
    await wrapper.find(".equip-search").setValue("坚守");
    expect(wrapper.findAll(".equip-card")).toHaveLength(1);

    await wrapper.find(".equip-search").setValue("");
    const tier6 = wrapper
      .findAll(".tier-chip")
      .find((chip) => chip.text() === "Ⅵ");
    await tier6.trigger("click");
    expect(wrapper.findAll(".equip-card")).toHaveLength(11);
  });
});

describe("临时装备池", () => {
  it("should render staged items and emit events", async () => {
    const wrapper = mount(EquipmentStaging, {
      props: { items: ["坚守盾牌", "炎国短刀"], selected: "坚守盾牌" },
    });

    const items = wrapper.findAll(".stage-item");
    expect(items).toHaveLength(2);
    expect(items[0].classes()).toContain("selected");

    await items[1].trigger("click");
    expect(wrapper.emitted("select")[0]).toEqual(["炎国短刀"]);

    await items[0].find(".stage-remove").trigger("click");
    expect(wrapper.emitted("remove")[0]).toEqual(["坚守盾牌"]);

    await wrapper.find(".stage-clear").trigger("click");
    expect(wrapper.emitted("clear")).toBeTruthy();
  });

  it("should mark drag source as staging", async () => {
    const wrapper = mount(EquipmentStaging, {
      props: { items: ["坚守盾牌"] },
    });
    const dataTransfer = createDataTransfer();
    await wrapper.find(".stage-item").trigger("dragstart", { dataTransfer });

    expect(
      JSON.parse(dataTransfer.getData(EQUIPMENT_DRAG_TYPE)),
    ).toEqual({ name: "坚守盾牌", from: "staging" });
  });
});

describe("变形同构体的可见提示", () => {
  beforeEach(() => {
    useGameVersion().setVersion("guicheng");
  });

  it("should mark the covenant that gets a morph member", async () => {
    const team = ref([
      { name: "卡达", equipments: ["变形同构体", "坚守盾牌"] },
    ]);
    const { morphCovCounts, presentCovCounts } = useCovenantStats(
      team,
      "guicheng",
    );
    expect(presentCovCounts.value.坚守).toBe(1);
    expect(morphCovCounts.value.坚守).toBe(1);

    const wrapper = mount(CovenantsPanel, {
      props: {
        presentCovList: ["坚守"],
        presentCovCounts: { 坚守: 1 },
        advancedCovLevels: {},
        morphCovCounts: { 坚守: 1 },
      },
    });
    expect(wrapper.find(".morph-tag").exists()).toBe(true);
    expect(wrapper.find(".morph-tag").attributes("title")).toContain(
      "变形同构体",
    );
  });

  it("should activate the covenant when the extra member reaches the threshold", () => {
    const team = ref([
      { name: "卡达", equipments: ["变形同构体", "坚守盾牌"] },
      { name: "慕斯", equipments: ["变形同构体", "坚守盾牌"] },
    ]);
    const stats = useCovenantStats(team, "guicheng");
    expect(stats.presentCovCounts.value.坚守).toBe(2);
    expect(stats.activeCovList.value.map((item) => item.name)).toContain(
      "坚守",
    );
  });
});

describe("页面整合", () => {
  beforeEach(() => {
    useGameVersion().setVersion("guicheng");
  });

  it("should open the equipment pool from its own tab", async () => {
    const wrapper = mount(App, { attachTo: document.body });
    await nextTick();

    const tabs = wrapper.findAll(".tab-item").map((tab) => tab.text());
    expect(tabs).toEqual(["干员池", "装备池", "我的编队"]);

    // 默认停在干员池
    expect(wrapper.find(".operator-pool").exists()).toBe(true);
    expect(wrapper.find(".equipment-pool").exists()).toBe(false);

    // 临时装备池没有装备时不出现（与已激活盟约一致）
    expect(wrapper.find(".team-col .equip-staging").exists()).toBe(false);

    // 点击「装备池」切到独立页面
    const equipTab = wrapper
      .findAll(".tab-item")
      .find((tab) => tab.text() === "装备池");
    await equipTab.trigger("click");

    expect(wrapper.find(".equipment-pool").exists()).toBe(true);
    expect(wrapper.find(".operator-pool").exists()).toBe(false);

    // 点击装备后，临时装备池贴在编队干员正下方
    const card = wrapper
      .findAll(".equipment-pool .equip-card")
      .find((item) => item.text().includes("坚守盾牌"));
    await card.trigger("click");
    await nextTick();

    const teamGrid = wrapper.find(".team-grid");
    const staging = wrapper.find(".team-col .equip-staging");
    expect(staging.exists()).toBe(true);
    expect(
      teamGrid.element.compareDocumentPosition(staging.element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    wrapper.unmount();
  });

  it("should stage equipment on click and clear it after equipping", async () => {
    const wrapper = mount(App, { attachTo: document.body });
    await nextTick();

    // 点击干员池第一个干员
    await wrapper.find(".pool-grid .op-unit").trigger("click");
    await nextTick();

    // 切到装备池页面
    await wrapper
      .findAll(".tab-item")
      .find((tab) => tab.text() === "装备池")
      .trigger("click");
    await nextTick();

    // 点击装备池里的坚守盾牌
    const card = wrapper
      .findAll(".equipment-pool .equip-card")
      .find((item) => item.text().includes("坚守盾牌"));
    await card.trigger("click");
    await nextTick();

    expect(wrapper.find(".equip-staging .stage-item").exists()).toBe(true);

    // 点击编队干员头像完成装备（编队始终在右侧可见）
    await wrapper.find(".team-grid .op-unit .img-container").trigger("click");
    await nextTick();

    expect(wrapper.find(".team-grid .equip-badge").exists()).toBe(true);
    expect(wrapper.find(".equip-staging .stage-item").exists()).toBe(false);
    wrapper.unmount();
  });

  it("should hide the equipment tab for the 盟约 version", async () => {
    useGameVersion().setVersion("mengyue");
    const wrapper = mount(App);
    const tabs = wrapper.findAll(".tab-item").map((tab) => tab.text());
    expect(tabs).toEqual(["干员池", "我的编队"]);
    expect(wrapper.find(".equipment-pool").exists()).toBe(false);
    expect(wrapper.find(".equip-staging").exists()).toBe(false);
  });
});
