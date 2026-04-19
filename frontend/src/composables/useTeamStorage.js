import { ref } from "vue";

const STORAGE_TEAMS_KEY = "arknights_saved_teams";
const STORAGE_COLLECTIONS_KEY = "arknights_team_collections";

/**
 * 编队数据存储管理
 * 负责将编队和合集数据持久化到浏览器的 localStorage
 * @returns {Object} 存储操作方法和响应式数据
 */
export function useTeamStorage() {
  /** @type {import('vue').Ref<Array>} 未分类的编队列表 */
  const savedTeams = ref([]);

  /** @type {import('vue').Ref<Array>} 合集列表，每个合集包含 name、teams、expanded 属性 */
  const teamCollections = ref([]);

  /**
   * 从 localStorage 加载已保存的编队和合集数据
   * 页面初始化时调用
   */
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

  /**
   * 仅保存合集数据到 localStorage
   * 内部会过滤掉 expanded 等 UI 状态字段
   */
  const saveCollections = () => {
    const collectionsToSave = teamCollections.value.map(
      ({ expanded, ...rest }) => rest,
    );
    localStorage.setItem(
      STORAGE_COLLECTIONS_KEY,
      JSON.stringify(collectionsToSave),
    );
  };

  /**
   * 保存所有数据（编队 + 合集）到 localStorage
   */
  const saveAllData = () => {
    localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(savedTeams.value));
    saveCollections();
  };

  /**
   * 新增或更新一个编队
   * @param {Object} options - 配置项
   * @param {Object} options.newTeam - 要保存的编队对象
   * @param {string|null} options.collectionName - 目标合集名称，null 表示不归类
   * @param {Object|null} options.editingLocation - 编辑模式下的原位置信息
   * @param {number|null} options.editingLocation.collectionIndex - 原合集索引
   * @param {number} options.editingLocation.teamIndex - 原编队索引
   */
  const addOrUpdateTeam = ({ newTeam, collectionName, editingLocation }) => {
    // 编辑模式：替换原有编队
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

    // 新增模式
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

  /**
   * 删除指定位置的编队
   * @param {Object} location - 位置信息
   * @param {number|null} location.collectionIndex - 合集索引，null 表示在未分类中
   * @param {number} location.teamIndex - 编队在列表中的索引
   */
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

  /**
   * 将编队移动到指定合集
   * @param {Object} options - 配置项
   * @param {Object} options.teamItem - 要移动的编队对象
   * @param {number|null} options.savedIndex - 在未分类列表中的原索引，null 表示不在未分类中
   * @param {string} options.targetCollectionName - 目标合集名称
   */
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
