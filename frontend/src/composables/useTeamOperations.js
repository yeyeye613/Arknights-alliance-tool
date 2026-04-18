import { ref } from "vue";

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

  const deleteTeam = (collectionIndex, teamIndex) => {
    deleteStoredTeam({ collectionIndex, teamIndex });
    showTempMessage("编队已删除");
  };

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
