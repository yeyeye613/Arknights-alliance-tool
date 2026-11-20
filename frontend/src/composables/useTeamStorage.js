import { ref } from "vue";

import {
  loadCollections,
  loadTeams,
  saveCollections as persistCollections,
  saveTeams,
} from "@/infrastructure/storage/teamsRepository";

/**
 * 编队数据存储管理
 * 负责将编队和合集数据持久化到浏览器本地存储
 * @returns {Object} 存储操作方法和响应式数据
 */
export function useTeamStorage() {
  /** @type {import('vue').Ref<Array>} 未分类的编队列表 */
  const savedTeams = ref([]);

  /** @type {import('vue').Ref<Array>} 合集列表，每个合集包含 name、teams、expanded 属性 */
  const teamCollections = ref([]);

  /**
   * 从本地存储加载已保存的编队和合集数据
   * 页面初始化时调用
   */
  const initSavedTeams = () => {
    savedTeams.value = loadTeams();
    teamCollections.value = loadCollections();
  };

  /**
   * 仅保存合集数据到本地存储
   * 内部会过滤掉 expanded 等 UI 状态字段
   */
  const saveCollections = () => {
    persistCollections(teamCollections.value);
  };

  /**
   * 保存所有数据（编队 + 合集）到本地存储
   */
  const saveAllData = () => {
    saveTeams(savedTeams.value);
    saveCollections();
  };

  /** 按名字找合集；合集名是稳定引用，索引会随增删漂移 */
  const findCollection = (name) =>
    teamCollections.value.find((collection) => collection.name === name);

  /**
   * 新增或更新一个编队
   * @param {Object} options - 配置项
   * @param {Object} options.newTeam - 要保存的编队对象
   * @param {string|null} options.collectionName - 目标合集名称，null 表示不归类
   * @param {Object|null} options.editingLocation - 编辑模式下的原位置信息
   * @param {string|null} options.editingLocation.collectionName - 原合集名称，null 表示未分类
   * @param {number} options.editingLocation.teamIndex - 原编队索引
   */
  const addOrUpdateTeam = ({ newTeam, collectionName, editingLocation }) => {
    // 编辑模式：替换原有编队
    if (editingLocation) {
      const { collectionName: originName, teamIndex } = editingLocation;
      if (originName) {
        findCollection(originName).teams[teamIndex] = newTeam;
        saveCollections();
      } else {
        savedTeams.value[teamIndex] = newTeam;
        saveTeams(savedTeams.value);
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
          ...(newTeam.version ? { version: newTeam.version } : {}),
        });
        saveCollections();
      }
    } else {
      savedTeams.value.push(newTeam);
      saveTeams(savedTeams.value);
    }
  };

  /**
   * 删除指定位置的编队
   * @param {Object} location - 位置信息
   * @param {string|null} location.collectionName - 合集名称，null 表示在未分类中
   * @param {number} location.teamIndex - 编队在列表中的索引
   */
  const deleteTeam = ({ collectionName, teamIndex }) => {
    if (collectionName) {
      const collection = findCollection(collectionName);
      collection.teams.splice(teamIndex, 1);
      // 合集空了就整组移除，避免留下看不到的空目录
      if (collection.teams.length === 0) {
        teamCollections.value = teamCollections.value.filter(
          (item) => item !== collection,
        );
      }
      saveCollections();
    } else {
      savedTeams.value.splice(teamIndex, 1);
      saveTeams(savedTeams.value);
    }
  };

  /**
   * 将编队移动到指定合集
   * @param {Object} options - 配置项
   * @param {Object} options.teamItem - 要移动的编队对象
   * @param {string|null} options.fromCollectionName - 原合集名称，null 表示来自未分类
   * @param {number|null} options.savedIndex - 在未分类列表中的原索引
   * @param {string} options.targetCollectionName - 目标合集名称
   */
  const moveToCollection = ({
    teamItem,
    fromCollectionName = null,
    savedIndex = null,
    targetCollectionName,
  }) => {
    // 先离开原位置：合集内移动原本只 push 不删源，会留下两份
    if (fromCollectionName) {
      const source = findCollection(fromCollectionName);
      source.teams = source.teams.filter((item) => item !== teamItem);
      if (source.teams.length === 0) {
        teamCollections.value = teamCollections.value.filter(
          (item) => item !== source,
        );
      }
    } else if (savedIndex !== null && savedIndex !== undefined) {
      savedTeams.value.splice(savedIndex, 1);
      saveTeams(savedTeams.value);
    }

    let collection = findCollection(targetCollectionName);
    if (!collection) {
      collection = {
        name: targetCollectionName,
        teams: [],
        expanded: true,
        ...(teamItem?.version ? { version: teamItem.version } : {}),
      };
      teamCollections.value.push(collection);
    }

    collection.teams.push(teamItem);
    saveCollections();
  };

  // 新增：操作方法
  /**
   * 保存新编队
   * @param {Object} teamData - 弹窗提交的数据 { name, team, collectionIndex }
   * @param {(message: string) => void} showTempMessage - 提示回调
   * @param {string} [versionId] - 所属游戏版本
   */
  const saveTeam = (teamData, showTempMessage, versionId) => {
    const newTeam = {
      name: teamData.name,
      team: [...teamData.team],
      createTime: new Date().toLocaleString(),
      ...(versionId ? { version: versionId } : {}),
    };

    addOrUpdateTeam({
      newTeam,
      collectionName: teamData.collectionName || null,
      editingLocation: null,
    });

    showTempMessage("编队保存成功");
  };

  /**
   * 更新已有编队
   * @param {Object} teamData - 弹窗提交的数据 { name, team, collectionIndex, originalIndex, originalCollectionIndex }
   * @param {(message: string) => void} showTempMessage - 提示回调
   * @param {string} [versionId] - 所属游戏版本
   */
  const updateTeam = (teamData, showTempMessage, versionId) => {
    const updatedTeam = {
      name: teamData.name,
      team: [...teamData.team],
      createTime: new Date().toLocaleString(),
      ...(versionId ? { version: versionId } : {}),
    };

    addOrUpdateTeam({
      newTeam: updatedTeam,
      collectionName: teamData.collectionName || null,
      editingLocation:
        teamData.originalIndex !== undefined
          ? {
              collectionName: teamData.originalCollectionName || null,
              teamIndex: teamData.originalIndex,
            }
          : null,
    });

    showTempMessage("编队更新成功");
  };

  const deleteTeamOp = (collectionName, teamIndex, showTempMessage) => {
    deleteTeam({ collectionName, teamIndex });
    showTempMessage("编队已删除");
  };

  /**
   * 把编队移动到合集（目标合集名由视图层询问后放进 payload）
   * @param {Object} payload - 见 moveToCollection
   * @param {(message: string) => void} showTempMessage - 提示回调
   */
  const moveToCollectionOp = (payload, showTempMessage) => {
    moveToCollection(payload);
    showTempMessage(`已移动到合集「${payload.targetCollectionName}」`);
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
    // 新增操作方法
    saveTeam,
    updateTeam,
    deleteTeamOp,
    moveToCollectionOp,
  };
}
