import { describe, it, expect, beforeEach } from "vitest";
import { useTeamStorage } from "../composables/useTeamStorage";

describe("useTeamStorage composable", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should initialize with empty data when localStorage is empty", () => {
    const { savedTeams, teamCollections, initSavedTeams } = useTeamStorage();
    initSavedTeams();
    expect(savedTeams.value).toEqual([]);
    expect(teamCollections.value).toEqual([]);
  });

  it("should add a new team and persist to localStorage", () => {
    const { savedTeams, teamCollections, initSavedTeams, addOrUpdateTeam } =
      useTeamStorage();
    initSavedTeams();

    const newTeam = {
      name: "测试队",
      team: [{ id: 1, name: "干员1", avatar: "a" }],
      createTime: "",
    };
    addOrUpdateTeam({ newTeam, collectionName: "", editingLocation: null });

    expect(savedTeams.value.length).toBe(1);
    expect(savedTeams.value[0].name).toBe("测试队");

    const persisted = JSON.parse(
      window.localStorage.getItem("arknights_saved_teams"),
    );
    expect(persisted.length).toBe(1);
    expect(persisted[0].name).toBe("测试队");

    expect(teamCollections.value).toEqual([]);
  });

  it("should move an ungrouped team into a new collection", () => {
    const {
      savedTeams,
      teamCollections,
      initSavedTeams,
      addOrUpdateTeam,
      moveToCollection,
    } = useTeamStorage();
    initSavedTeams();

    const newTeam = { name: "队A", team: [], createTime: "" };
    addOrUpdateTeam({ newTeam, collectionName: "", editingLocation: null });
    expect(savedTeams.value.length).toBe(1);

    moveToCollection({
      teamItem: newTeam,
      savedIndex: 0,
      targetCollectionName: "合集A",
    });

    expect(savedTeams.value).toEqual([]);
    expect(teamCollections.value.length).toBe(1);
    expect(teamCollections.value[0].name).toBe("合集A");
    expect(teamCollections.value[0].teams[0].name).toBe("队A");
  });

  it("should delete team from collection and remaining collections", () => {
    const {
      savedTeams,
      teamCollections,
      initSavedTeams,
      addOrUpdateTeam,
      deleteTeam,
    } = useTeamStorage();
    initSavedTeams();

    const newTeam = { name: "队B", team: [], createTime: "" };
    addOrUpdateTeam({
      newTeam,
      collectionName: "合集B",
      editingLocation: null,
    });

    expect(teamCollections.value.length).toBe(1);
    deleteTeam({ collectionIndex: 0, teamIndex: 0 });

    expect(teamCollections.value.length).toBe(0);
  });
});
