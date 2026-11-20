/**
 * 当前编队的交互返回值
 *
 * P3 把「满员提示」从 composable 挪到了视图层：这里断言返回值契约，
 * 避免以后又把 alert 塞回来——注意用例里不 mock alert，
 * 一旦实现重新调用浏览器对话框，jsdom 会直接报错。
 */
import { describe, it, expect } from "vitest";
import { ref } from "vue";

import { useTeamManagement } from "../composables/useTeamManagement";

const op = (name) => ({ name, tier: "Ⅵ" });

describe("useTeamManagement", () => {
  it("未满员时把干员加入编队并返回 true", () => {
    const teamLimit = ref(3);
    const { team, addToTeam } = useTeamManagement(teamLimit);

    expect(addToTeam(op("能天使"))).toBe(true);
    expect(team.value).toHaveLength(1);
    expect(team.value[0].name).toBe("能天使");
  });

  it("满员时返回 false，且不改动编队", () => {
    const teamLimit = ref(2);
    const { team, addToTeam } = useTeamManagement(teamLimit);

    addToTeam(op("能天使"));
    addToTeam(op("银灰"));

    expect(addToTeam(op("夜刀"))).toBe(false);
    expect(team.value.map((item) => item.name)).toEqual(["能天使", "银灰"]);
  });

  it("加入的是干员副本，改副本不会污染来源对象", () => {
    const teamLimit = ref(8);
    const { team, addToTeam } = useTeamManagement(teamLimit);
    const source = op("能天使");

    addToTeam(source);
    team.value[0].name = "改过的名字";

    expect(source.name).toBe("能天使");
  });

  it("上限下调后截断超出的干员", () => {
    const teamLimit = ref(3);
    const { team, addToTeam, handleLimitChange } = useTeamManagement(teamLimit);

    addToTeam(op("A"));
    addToTeam(op("B"));
    addToTeam(op("C"));

    teamLimit.value = 1;
    handleLimitChange();

    expect(team.value.map((item) => item.name)).toEqual(["A"]);
  });
});
