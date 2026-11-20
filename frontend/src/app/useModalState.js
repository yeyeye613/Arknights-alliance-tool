import { ref } from "vue";

export function useModalState() {
  const showTeamModal = ref(false);
  const editingTeam = ref(null);
  const editingLocation = ref(null);

  const showShareModal = ref(false);
  const showImportModal = ref(false);
  const shareType = ref("");
  const shareCode = ref("");
  const currentShareTeam = ref(null);
  const currentShareCollection = ref(null);

  const tempMessage = ref("");

  /**
   * 打开「保存编队」弹窗
   * @returns {boolean} 是否打开；空编队返回 false，提示文案由调用方决定
   */
  const openSaveTeamModal = (team) => {
    if (!team.length) {
      return false;
    }
    // 队名与合集选择由 SaveTeamDialog 自己持有，这里只负责开窗与编辑态
    editingTeam.value = null;
    editingLocation.value = null;
    showTeamModal.value = true;
    return true;
  };

  const closeTeamModal = () => {
    showTeamModal.value = false;
    editingTeam.value = null;
    editingLocation.value = null;
  };

  const closeShareModal = () => {
    showShareModal.value = false;
    shareCode.value = "";
    currentShareTeam.value = null;
    currentShareCollection.value = null;
  };

  const closeImportModal = () => {
    showImportModal.value = false;
  };

  const showTempMessage = (msg) => {
    tempMessage.value = msg;
    setTimeout(() => {
      tempMessage.value = "";
    }, 2000);
  };

  const editTeam = (teamItem, collectionName, teamIndex) => {
    editingTeam.value = teamItem;
    editingLocation.value = { collectionName, teamIndex };
    showTeamModal.value = true;
  };

  return {
    showTeamModal,
    editingTeam,
    editingLocation,
    showShareModal,
    showImportModal,
    shareType,
    shareCode,
    currentShareTeam,
    currentShareCollection,
    tempMessage,
    openSaveTeamModal,
    closeTeamModal,
    closeShareModal,
    closeImportModal,
    showTempMessage,
    editTeam,
  };
}
