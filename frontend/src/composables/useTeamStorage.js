import { ref } from "vue";

const STORAGE_TEAMS_KEY = "arknights_saved_teams";
const STORAGE_COLLECTIONS_KEY = "arknights_team_collections";

export function useTeamStorage() {
  const savedTeams = ref([]);
  const teamCollections = ref([]);

  const initSavedTeams = () => {
    try {
      const saved = localStorage.getItem(STORAGE_TEAMS_KEY);
      if (saved) {
        savedTeams.value = JSON.parse(saved);
      } else {
        savedTeams.value = [];
      }
    } catch (error) {
      console.error("加载编队数据失败", error);
      savedTeams.value = [];
    }

    try {
      const collections = localStorage.getItem(STORAGE_COLLECTIONS_KEY);
      if (collections) {
        const parsed = JSON.parse(collections);
        teamCollections.value = parsed.map((c) => ({ ...c, expanded: true }));
      } else {
        teamCollections.value = [];
      }
    } catch (error) {
      console.error("加载合集数据失败", error);
      teamCollections.value = [];
    }
  };

  const saveCollections = () => {
    const collectionsToSave = teamCollections.value.map(
      ({ expanded, ...rest }) => rest,
    );
    localStorage.setItem(
      STORAGE_COLLECTIONS_KEY,
      JSON.stringify(collectionsToSave),
    );
  };

  const saveAllData = () => {
    localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(savedTeams.value));
    saveCollections();
  };

  const addOrUpdateTeam = ({ newTeam, collectionName, editingLocation }) => {
    if (editingLocation) {
      const { collectionIndex, teamIndex } = editingLocation;
      if (collectionIndex !== null && collectionIndex >= 0) {
        teamCollections.value[collectionIndex].teams[teamIndex] = newTeam;
        saveCollections();
      } else {
        savedTeams.value[teamIndex] = newTeam;
        localStorage.setItem(
          STORAGE_TEAMS_KEY,
          JSON.stringify(savedTeams.value),
        );
      }
      return;
    }

    if (collectionName) {
      const collection = teamCollections.value.find(
        (c) => c.name === collectionName,
      );
      if (collection) {
        collection.teams.push(newTeam);
        saveCollections();
      } else {
        teamCollections.value.push({
          name: collectionName,
          teams: [newTeam],
          expanded: true,
        });
        saveCollections();
      }
    } else {
      savedTeams.value.push(newTeam);
      localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(savedTeams.value));
    }
  };

  const deleteTeam = ({ collectionIndex, teamIndex }) => {
    if (collectionIndex !== null && collectionIndex >= 0) {
      teamCollections.value[collectionIndex].teams.splice(teamIndex, 1);
      if (teamCollections.value[collectionIndex].teams.length === 0) {
        teamCollections.value.splice(collectionIndex, 1);
      }
      saveCollections();
    } else {
      savedTeams.value.splice(teamIndex, 1);
      localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(savedTeams.value));
    }
  };

  const moveToCollection = ({ teamItem, savedIndex, targetCollectionName }) => {
    let collection = teamCollections.value.find(
      (c) => c.name === targetCollectionName,
    );
    if (!collection) {
      collection = { name: targetCollectionName, teams: [], expanded: true };
      teamCollections.value.push(collection);
    }

    collection.teams.push(teamItem);
    if (savedIndex !== null && savedIndex !== undefined) {
      savedTeams.value.splice(savedIndex, 1);
      localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(savedTeams.value));
    }
    saveCollections();
  };

  return {
    savedTeams,
    teamCollections,
    initSavedTeams,
    saveCollections,
    saveAllData,
    addOrUpdateTeam,
    deleteTeam,
    moveToCollection,
  };
}
