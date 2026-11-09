import { describe, it, expect, beforeEach } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

import {
  GAME_VERSIONS,
  DEFAULT_VERSION_ID,
  getGameVersion,
  getCovenantsByGroup,
  getOperatorCovenants,
  findOperatorEverywhere,
  CORE_GROUP,
  ADDITIONAL_GROUP,
} from "../data/versions.js";
import { useGameVersion } from "../composables/useGameVersion.js";
import { useCovenantStats } from "../composables/useCovenantStats.js";
import SavedTeamsPanel from "../components/SavedTeamsPanel.vue";
import TeamPanel from "../components/TeamPanel.vue";

describe("游戏版本数据", () => {
  it("应包含盟约与规程两个版本", () => {
    expect(GAME_VERSIONS.map((v) => v.id)).toEqual(["mengyue", "guicheng"]);
    expect(DEFAULT_VERSION_ID).toBe("mengyue");
  });

  it("盟约版本应有 8 个核心盟约", () => {
    const version = getGameVersion("mengyue");
    expect(getCovenantsByGroup(version, CORE_GROUP)).toHaveLength(8);
    expect(getCovenantsByGroup(version, CORE_GROUP)).toContain("拉特兰");
  });

  it("规程版本应有 10 个核心盟约与新增盟约", () => {
    const version = getGameVersion("guicheng");
    const core = getCovenantsByGroup(version, CORE_GROUP);
    const additional = getCovenantsByGroup(version, ADDITIONAL_GROUP);

    expect(core).toHaveLength(10);
    expect(core).toContain("乌萨斯");
    expect(core).toContain("伊比利亚");
    expect(core).toContain("莱塔尼亚");
    expect(core).not.toContain("拉特兰");
    expect(additional).toContain("聚合");
    expect(additional).toContain("绝技");
  });

  it("规程版本的干员池与盟约效果应与盟约版本不同", () => {
    const mengyue = getGameVersion("mengyue");
    const guicheng = getGameVersion("guicheng");

    expect(Object.keys(mengyue.operators)).toHaveLength(113);
    expect(Object.keys(guicheng.operators)).toHaveLength(143);
    expect(guicheng.operators["拜松"]).toBeTruthy();
    expect(mengyue.operators["拜松"]).toBeUndefined();

    // 同一盟约在两版中的效果描述不同
    expect(guicheng.covenants["炎"].effects[0].description).toContain(
      "攻击力+(23+0.9×层数)%",
    );
    expect(mengyue.covenants["炎"].effects[0].description).not.toBe(
      guicheng.covenants["炎"].effects[0].description,
    );
  });

  it("规程版本的自选干员应按阵营映射核心盟约", () => {
    const guicheng = getGameVersion("guicheng");
    // 白铁在规程干员池中，直接取池内数据
    expect(getOperatorCovenants("白铁", guicheng)).toEqual(
      guicheng.operators["白铁"].covenants,
    );
    // 陈不在规程干员池中，按阵营映射到核心盟约「炎」
    expect(guicheng.operators["陈"]).toBeUndefined();
    expect(getOperatorCovenants("陈", guicheng)).toEqual(["炎"]);
    // 拉特兰在规程中不是核心盟约，无法匹配时降落为协防干员
    expect(guicheng.operators["塑心"]).toBeUndefined();
    expect(getOperatorCovenants("塑心", guicheng)).toEqual(["协防干员"]);
  });

  it("应能跨版本查找干员", () => {
    expect(findOperatorEverywhere("惊蛰")).toBeTruthy();
    expect(findOperatorEverywhere("拜松")).toBeTruthy();
    expect(findOperatorEverywhere("不存在的干员")).toBeNull();
  });
});

describe("版本切换与盟约统计联动", () => {
  beforeEach(() => {
    useGameVersion().setVersion("mengyue");
  });

  it("切换版本后默认统计使用对应版本的盟约数据", () => {
    const { currentVersionId, setVersion } = useGameVersion();
    const team = ref([{ name: "折桠" }, { name: "烈夏" }, { name: "真理" }]);

    expect(setVersion("guicheng")).toBe(true);
    expect(currentVersionId.value).toBe("guicheng");

    const { presentCovCounts, activeCovList } = useCovenantStats(team);
    expect(presentCovCounts.value["乌萨斯"]).toBe(3);
    expect(activeCovList.value.some((cov) => cov.name === "乌萨斯")).toBe(true);
  });

  it("盟约版本下同一批干员不产生乌拉萨斯层数", () => {
    const team = ref([{ name: "折桠" }, { name: "烈夏" }, { name: "真理" }]);
    const { presentCovCounts } = useCovenantStats(team, getGameVersion("mengyue"));

    expect(presentCovCounts.value["乌萨斯"]).toBeUndefined();
  });
});

describe("TeamPanel 跨版本干员提示", () => {
  it("编队中残留其他版本干员时给出提示", async () => {
    useGameVersion().setVersion("guicheng");
    const wrapper = mount(TeamPanel, {
      props: {
        team: [{ name: "拜松" }, { name: "惊蛰" }],
        teamLimit: 8,
      },
    });

    expect(wrapper.text()).toContain("没有 1");
    expect(wrapper.findAll(".op-missing")).toHaveLength(1);
    wrapper.unmount();
    useGameVersion().setVersion("mengyue");
  });
});

describe("SavedTeamsPanel 版本过滤", () => {
  const savedTeams = [
    { name: "旧版队", team: [], version: "mengyue" },
    { name: "新版队", team: [], version: "guicheng" },
    { name: "历史遗留队", team: [] },
  ];

  it("只展示当前版本的编队", () => {
    const wrapper = mount(SavedTeamsPanel, {
      props: {
        savedTeams,
        teamCollections: [],
        currentVersionId: "guicheng",
      },
    });

    expect(wrapper.text()).toContain("新版队");
    expect(wrapper.text()).not.toContain("旧版队");
    expect(wrapper.text()).not.toContain("历史遗留队");
  });

  it("未标记版本的历史编队归入盟约版本", () => {
    const wrapper = mount(SavedTeamsPanel, {
      props: {
        savedTeams,
        teamCollections: [],
        currentVersionId: "mengyue",
      },
    });

    expect(wrapper.text()).toContain("旧版队");
    expect(wrapper.text()).toContain("历史遗留队");
    expect(wrapper.text()).not.toContain("新版队");
  });

  it("删除时回传原始索引，避免版本过滤后错位", async () => {
    const wrapper = mount(SavedTeamsPanel, {
      props: {
        savedTeams,
        teamCollections: [],
        currentVersionId: "guicheng",
      },
    });

    const editToggle = wrapper
      .findAll("button")
      .find((btn) => btn.text() === "编辑模式");
    await editToggle.trigger("click");

    const deleteBtn = wrapper
      .findAll("button")
      .find((btn) => btn.text() === "删除");
    await deleteBtn.trigger("click");

    // 过滤后只剩「新版队」，其原始索引应为 1
    expect(wrapper.emitted("deleteTeam")[0]).toEqual([null, 1]);
  });
});
