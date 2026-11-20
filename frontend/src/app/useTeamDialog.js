import { ref } from "vue";

/**
 * 保存 / 编辑编队弹窗
 *
 * 只负责「开哪个窗、编辑的是哪一条」；队名与合集选择由 SaveTeamDialog 自己持有，
 * 所以这里没有 teamName / selectedCollection 之类的输入状态。
 */
export function useTeamDialog() {
  const showTeamModal = ref(false);
  const editingTeam = ref(null);
  const editingLocation = ref(null);

  /**
   * 打开「保存编队」弹窗
   * @returns {boolean} 是否打开；空编队返回 false，提示文案由调用方决定
   */
  const openSaveTeamModal = (team) => {
    if (!team.length) {
      return false;
    }
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

  /**
   * 打开编辑态
   * @param {Object} teamItem 已保存的编队
   * @param {string|null} collectionName 原合集名，未分类传 null
   * @param {number} teamIndex 在原位置中的索引
   */
  const editTeam = (teamItem, collectionName, teamIndex) => {
    editingTeam.value = teamItem;
    editingLocation.value = { collectionName, teamIndex };
    showTeamModal.value = true;
  };

  return {
    showTeamModal,
    editingTeam,
    editingLocation,
    openSaveTeamModal,
    closeTeamModal,
    editTeam,
  };
}
