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

  const openSaveTeamModal = (team) => {
    if (!team.length) {
      alert("当前编队为空，无法保存");
      return;
    }
    teamName.value = "";
    editingTeam.value = null;
    editingLocation.value = null;
    selectedCollection.value = "";
    showTeamModal.value = true;
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
  };
}
