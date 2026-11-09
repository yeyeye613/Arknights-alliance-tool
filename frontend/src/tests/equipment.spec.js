import { describe, it, expect, beforeEach } from "vitest";
import { nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import equipmentData from "../data/equipment.guicheng.json";
import {
  EQUIPMENT_SLOT_COUNT,
  MORPH_EQUIPMENT,
  getCombinedEquipments,
  getEquipmentList,
  getMorphCovenant,
  getOperatorEquipmentNames,
} from "../data/equipment.js";
import { getGameVersion, getEffectiveOperatorCovenants } from "../data/versions.js";
import { useGameVersion } from "../composables/useGameVersion.js";
import { useCovenantStats } from "../composables/useCovenantStats.js";
import { useShareCode } from "../composables/useShareCode.js";
import EquipmentPicker from "../components/EquipmentPicker.vue";
import TeamPanel from "../components/TeamPanel.vue";

const guicheng = getGameVersion("guicheng");

describe("装备池数据", () => {
  it("should include the whole 规程 equipment pool", () => {
    const list = getEquipmentList(guicheng);
    expect(list.length).toBe(70);
    expect(list.filter((item) => item.tier === 6).length).toBe(11);
    expect(guicheng.equipments[MORPH_EQUIPMENT]).toBeTruthy();
    // 盟约版没有装备数据库
    expect(getGameVersion("mengyue").equipments).toEqual({});
  });

  it("should expose 19 equipment that can pair with 变形同构体", () => {
    const morphItems = Object.values(equipmentData).filter((item) => item.morph);
    // 12 件单件 + 7 种维式重锤
    expect(morphItems.length).toBe(19);
  });

  it("should describe combined equipment", () => {
    const combos = getCombinedEquipments(["不退者之盾", "不退者力场"], guicheng);
    expect(combos.map((item) => item.name)).toEqual(["不退者卫护系统"]);
  });
});

describe("变形同构体效果", () => {
  it("should grant the paired covenant", () => {
    expect(getMorphCovenant([MORPH_EQUIPMENT, "坚守盾牌"], guicheng)).toBe("坚守");
    expect(getMorphCovenant(["炎国短刀", MORPH_EQUIPMENT], guicheng)).toBe("炎");
    // 维式重锤整个系列都算
    expect(getMorphCovenant([MORPH_EQUIPMENT, "终极维式重锤"], guicheng)).toBe(
      "维多利亚",
    );
  });

  it("should do nothing without a valid partner", () => {
    expect(getMorphCovenant(["坚守盾牌"], guicheng)).toBe("");
    expect(getMorphCovenant([MORPH_EQUIPMENT], guicheng)).toBe("");
    expect(getMorphCovenant([MORPH_EQUIPMENT, "源石溶剂"], guicheng)).toBe("");
  });

  it("should append the covenant to operator covenants once", () => {
    const op = { name: "卡达", equipments: [MORPH_EQUIPMENT, "坚守盾牌"] };
    expect(getEffectiveOperatorCovenants(op, guicheng)).toEqual(["奥术", "坚守"]);

    // 干员本身已在该盟约时不会重复计数
    const same = { name: "卡达", equipments: [MORPH_EQUIPMENT, "奥术法阵"] };
    expect(getEffectiveOperatorCovenants(same, guicheng)).toEqual(["奥术"]);
  });

  it("should count the extra covenant into team stats", () => {
    const team = ref([{ name: "卡达", equipments: [] }]);
    const { presentCovCounts } = useCovenantStats(team, "guicheng");
    expect(presentCovCounts.value.坚守).toBeUndefined();

    team.value = [{ name: "卡达", equipments: [MORPH_EQUIPMENT, "坚守盾牌"] }];
    expect(presentCovCounts.value.坚守).toBe(1);
    expect(presentCovCounts.value.奥术).toBe(1);
  });

  it("should keep at most two equipment per operator", () => {
    expect(EQUIPMENT_SLOT_COUNT).toBe(2);
    const names = getOperatorEquipmentNames({
      equipments: ["坚守盾牌", "炎国短刀", "奥术法阵"],
    });
    expect(names).toEqual(["坚守盾牌", "炎国短刀"]);
  });
});

describe("分享码携带装备", () => {
  const { generateTeamCode, parseCode, importTeam } = useShareCode();

  it("should round trip equipment", () => {
    const teamData = {
      name: "装备队",
      team: [
        { name: "卡达", equipments: [MORPH_EQUIPMENT, "坚守盾牌"] },
        { name: "慕斯", equipments: [] },
      ],
    };

    const code = generateTeamCode(teamData, "guicheng");
    const parsed = parseCode(code);
    const imported = importTeam(parsed);

    expect(imported.team[0].equipments).toEqual([MORPH_EQUIPMENT, "坚守盾牌"]);
    expect(imported.team[1].equipments).toBeUndefined();
    expect(imported.team[0].name).toBe("卡达");
  });

  it("should keep codes without equipment backward compatible", () => {
    const code = generateTeamCode(
      { name: "普通队", team: [{ name: "卡达" }] },
      "guicheng",
    );
    const parsed = parseCode(code);
    expect(parsed.ops).toEqual(["卡达"]);
    expect(code.length).toBeLessThan(40);
  });
});

describe("装备选择器", () => {
  beforeEach(() => {
    const { setVersion } = useGameVersion();
    setVersion("guicheng");
  });

  it("should only render badges for equipped slots", async () => {
    const wrapper = mount(TeamPanel, {
      props: {
        team: [{ id: 0, name: "卡达", avatar: "" }],
        teamLimit: 8,
      },
    });
    // 未装备时不显示槽位
    expect(wrapper.findAll(".equip-badge")).toHaveLength(0);

    await wrapper.setProps({
      team: [{ id: 0, name: "卡达", avatar: "", equipments: ["坚守盾牌"] }],
    });
    expect(wrapper.findAll(".equip-badge")).toHaveLength(1);
  });

  const mountPicker = (equipments = [], initialSlot = 0) =>
    mount(EquipmentPicker, {
      props: { show: true, operatorName: "卡达", equipments, initialSlot },
      global: { stubs: { teleport: true } },
    });

  it("should render two slots", () => {
    const wrapper = mountPicker();
    expect(wrapper.findAll(".slot")).toHaveLength(2);
    expect(wrapper.text()).toContain("槽位 1");
  });

  it("should equip an item into the active slot", async () => {
    const wrapper = mountPicker();
    const items = wrapper.findAll(".equip-item");
    expect(items.length).toBeGreaterThan(0);

    await items[0].trigger("click");
    const emitted = wrapper.emitted("update:equipments");
    expect(emitted).toBeTruthy();
    expect(emitted.at(-1)[0]).toHaveLength(1);
  });

  it("should replace the active slot when two are already equipped", async () => {
    const wrapper = mountPicker(["坚守盾牌", "炎国短刀"], 1);
    await nextTick();

    const target = wrapper
      .findAll(".equip-item")
      .find((item) => !item.text().includes("坚守盾牌") && !item.text().includes("炎国短刀"));
    await target.trigger("click");

    const emitted = wrapper.emitted("update:equipments").at(-1)[0];
    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toBe("坚守盾牌");
  });

  it("should hint when 变形同构体 is active", async () => {
    const wrapper = mountPicker([MORPH_EQUIPMENT, "坚守盾牌"]);
    await nextTick();
    expect(wrapper.find(".morph-hint").text()).toContain("坚守");
  });
});
