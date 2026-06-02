import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useCovenantStats } from "../composables/useCovenantStats";

describe("useCovenantStats composable", () => {
  it("should apply harmony bonus to core covenants", () => {
    const team = ref([
      { name: "盟约·辅助干员" },
      { name: "号角" },
      { name: "风笛" },
    ]);

    const { presentCovCounts, activeCovList } = useCovenantStats(team);

    expect(presentCovCounts.value["维多利亚"]).toBe(3);
    expect(activeCovList.value.some((cov) => cov.name === "维多利亚")).toBe(true);
  });

  it("should not show extra core covenant when team has only harmony", () => {
    const team = ref([{ name: "缪尔赛思" }]);

    const { presentCovList, presentCovCounts } = useCovenantStats(team);

    expect(presentCovCounts.value["调和"]).toBe(1);
    expect(presentCovList.value).not.toContain("炎");
    expect(presentCovList.value).not.toContain("维多利亚");
  });

  it("should mark first advanced covenant level when first threshold is reached", () => {
    const team = ref([
      { name: "盟约·辅助干员" },
      { name: "惊蛰" },
      { name: "小满" },
      { name: "诗怀雅" },
      { name: "录武官" },
      { name: "星熊" },
    ]);

    const { presentCovCounts, advancedCovLevels } = useCovenantStats(team);

    expect(presentCovCounts.value["炎"]).toBe(6);
    expect(advancedCovLevels.value["炎"]).toBe(1);
  });

  it("should mark higher advanced covenant level when more thresholds are reached", () => {
    const team = ref([
      { name: "盟约·辅助干员" },
      { name: "惊蛰" },
      { name: "小满" },
      { name: "诗怀雅" },
      { name: "录武官" },
      { name: "星熊" },
      { name: "烛煌" },
      { name: "夕" },
      { name: "余" },
    ]);

    const { presentCovCounts, advancedCovLevels } = useCovenantStats(team);

    expect(presentCovCounts.value["炎"]).toBe(9);
    expect(advancedCovLevels.value["炎"]).toBe(2);
  });
});
