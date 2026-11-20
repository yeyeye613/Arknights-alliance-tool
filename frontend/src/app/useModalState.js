import { ref } from "vue";

export function useModalState() {
  const showTeamModal = ref(false);
  const teamName = ref("");
  const editingTeam = ref(null);
  const editingLocation = ref(null);
  const selectedCollection = ref("");
  const showNewCollectionInput = ref(false);
  const newCollectionName = ref("");

  const showShareModal = ref(false);
  const showImportModal = ref(false);
  const shareType = ref("");
  const shareCode = ref("");
  const importCode = ref("");
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
    teamName.value = "";
    editingTeam.value = null;
    editingLocation.value = null;
    selectedCollection.value = "";
    showTeamModal.value = true;
    return true;
  };

  const closeTeamModal = () => {
    showTeamModal.value = false;
    teamName.value = "";
    editingTeam.value = null;
    editingLocation.value = null;
    selectedCollection.value = "";
    showNewCollectionInput.value = false;
    newCollectionName.value = "";
  };

  const closeShareModal = () => {
    showShareModal.value = false;
    shareCode.value = "";
    currentShareTeam.value = null;
    currentShareCollection.value = null;
  };

  const closeImportModal = () => {
    showImportModal.value = false;
    importCode.value = "";
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
    teamName,
    editingTeam,
    editingLocation,
    selectedCollection,
    showNewCollectionInput,
    newCollectionName,
    showShareModal,
    showImportModal,
    shareType,
    shareCode,
    importCode,
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
