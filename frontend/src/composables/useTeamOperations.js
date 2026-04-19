import { ref } from "vue";

/**
 * 编队业务操作管理
 * 封装用户对编队的所有操作，调用存储层并处理 UI 反馈
 * 
 * @param {Function} useTeamStorage - 存储 composable 函数（非实例）
 * @param {Function} useShareCode - 分享码 composable 函数
 * @param {Function} useModalState - 弹窗状态 composable 函数
 * @param {import('vue').Ref} teamCollections - 合集列表响应式引用
 * @param {import('vue').Ref} savedTeams - 未分类编队列表响应式引用
 * @param {Function} saveCollections - 保存合集的方法
 * @param {Function} saveAllData - 保存所有数据的方法
 * @param {Function} addOrUpdateTeam - 新增/更新编队的方法
 * @param {Function} deleteStoredTeam - 删除编队的方法
 * @param {Function} moveStoredTeam - 移动编队的方法
 * @param {Function} generateTeamCode - 生成编队分享码的方法
 * @param {Function} generateCollectionCode - 生成合集分享码的方法
 * @param {Function} createTeamFromData - 从数据创建编队的方法
 * @param {Function} createCollectionFromData - 从数据创建合集的方法
 * @param {Function} showTempMessage - 显示临时提示消息的方法
 * @param {Function} closeShareModal - 关闭分享弹窗的方法
 * @param {Function} closeImportModal - 关闭导入弹窗的方法
 * @param {import('vue').Ref} shareType - 分享类型响应式引用
 * @param {import('vue').Ref} shareCode - 分享码响应式引用
 * @param {import('vue').Ref} currentShareTeam - 当前分享的编队响应式引用
 * @param {import('vue').Ref} currentShareCollection - 当前分享的合集响应式引用
 * @param {import('vue').Ref} showShareModal - 分享弹窗显示状态响应式引用
 * @returns {Object} 编队操作方法集合
 */
export function useTeamOperations(
  useTeamStorage,
  useShareCode,
  useModalState,
  teamCollections,
  savedTeams,
  saveCollections,
  saveAllData,
  addOrUpdateTeam,
  deleteStoredTeam,
  moveStoredTeam,
  generateTeamCode,
  generateCollectionCode,
  createTeamFromData,
  createCollectionFromData,
  showTempMessage,
  closeShareModal,
  closeImportModal,
  shareType,
  shareCode,
  currentShareTeam,
  currentShareCollection,
  showShareModal,
) {
  /**
   * 保存新编队
   * @param {Object} teamData - 弹窗收集的数据
   * @param {string} teamData.name - 编队名称
   * @param {Array} teamData.team - 干员列表
   * @param {number|null} teamData.collectionIndex - 所属合集索引
   * @param {Array} team - 当前编队数据（备用）
   */
  const saveTeam = (teamData, team) => {
    const newTeam = {
      name: teamData.name,
      team: [...teamData.team],
      createTime: new Date().toLocaleString(),
    };

    addOrUpdateTeam({
      newTeam,
      collectionName:
        teamData.collectionIndex !== null
          ? teamCollections.value[teamData.collectionIndex]?.name
          : null,
      editingLocation: null,
    });

    showTempMessage("编队保存成功");
  };

  /**
   * 更新已有编队
   * @param {Object} teamData - 弹窗收集的数据
   * @param {string} teamData.name - 新编队名称
   * @param {number} teamData.originalIndex - 原编队索引
   * @param {number|null} teamData.originalCollectionIndex - 原所属合集索引
   * @param {number|null} teamData.collectionIndex - 新所属合集索引
   * @param {Array} team - 当前编队数据
   */
  const updateTeam = (teamData, team) => {
    const updatedTeam = {
      name: teamData.name,
      team: [...team],
      createTime: new Date().toLocaleString(),
    };

    addOrUpdateTeam({
      newTeam: updatedTeam,
      collectionName:
        teamData.collectionIndex !== null
          ? teamCollections.value[teamData.collectionIndex]?.name
          : null,
      editingLocation:
        teamData.originalIndex !== undefined
          ? {
              collectionIndex: teamData.originalCollectionIndex,
              teamIndex: teamData.originalIndex,
            }
          : null,
    });

    showTempMessage("编队更新成功");
  };

  /**
   * 打开编辑编队的弹窗
   * @param {Object} teamItem - 要编辑的编队对象
   * @param {number|null} collectionIndex - 所在合集索引
   * @param {number} teamIndex - 在列表中的索引
   * @param {import('vue').Ref} editingTeam - 正在编辑的编队响应式引用
   * @param {import('vue').Ref} editingLocation - 编辑位置响应式引用
   * @param {import('vue').Ref} showTeamModal - 弹窗显示状态响应式引用
   */
  const editTeam = (
    teamItem,
    collectionIndex,
    teamIndex,
    editingTeam,
    editingLocation,
    showTeamModal,
  ) => {
    editingTeam.value = teamItem;
    editingLocation.value = { collectionIndex, teamIndex };
    showTeamModal.value = true;
  };

  /**
   * 删除编队
   * @param {number|null} collectionIndex - 所在合集索引
   * @param {number} teamIndex - 在列表中的索引
   */
  const deleteTeam = (collectionIndex, teamIndex) => {
    deleteStoredTeam({ collectionIndex, teamIndex });
    showTempMessage("编队已删除");
  };

  /**
   * 移动编队到指定合集（弹窗输入合集名）
   * @param {Object} teamItem - 要移动的编队对象
   * @param {number} index - 在当前列表中的索引
   */
  const moveToCollection = (teamItem, index) => {
    const collectionName = prompt("请输入合集名称：", "");
    if (!collectionName) return;

    moveStoredTeam({
      teamItem,
      savedIndex: index,
      targetCollectionName: collectionName,
    });
    showTempMessage(`已移动到合集「${collectionName}」`);
  };

  /**
   * 分享编队（生成分享码并打开弹窗）
   * @param {Object} teamItem - 要分享的编队对象
   */
  const shareTeam = (teamItem) => {
    currentShareTeam.value = { ...teamItem, type: "team" };
    shareType.value = "team";
    const code = generateTeamCode(teamItem);
    if (code) {
      shareCode.value = code;
      showShareModal.value = true;
    } else {
      showTempMessage("生成分享码失败");
    }
  };

  /**
   * 分享合集（生成分享码并打开弹窗）
   * @param {Object} collection - 要分享的合集对象
   */
  const shareCollection = (collection) => {
    currentShareCollection.value = { ...collection, type: "collection" };
    shareType.value = "collection";
    const code = generateCollectionCode(collection);
    if (code) {
      shareCode.value = code;
      showShareModal.value = true;
    } else {
      showTempMessage("生成分享码失败");
    }
  };

  /**
   * 从分享码导入编队或合集
   * @param {Object} data - 解析后的分享数据
   * @param {string} data.t - 类型标识（'team' 或 'collection'）
   */
  const importFromCode = (data) => {
    try {
      const key = data.t || data.type;
      if (key === "team") {
        const newTeam = createTeamFromData(data);
        savedTeams.value.push(newTeam);
        saveAllData();
        showTempMessage(`成功导入编队「${newTeam.name}」`);
      } else if (key === "collection") {
        const importedCollection = createCollectionFromData(data);
        teamCollections.value.push(importedCollection);
        saveCollections();
        showTempMessage(`成功导入合集「${importedCollection.name}」`);
      } else {
        showTempMessage("不支持的数据类型");
      }

      closeImportModal();
    } catch (error) {
      showTempMessage(error.message || "导入失败");
    }
  };

  return {
    saveTeam,
    updateTeam,
    editTeam,
    deleteTeam,
    moveToCollection,
    shareTeam,
    shareCollection,
    importFromCode,
  };
}
