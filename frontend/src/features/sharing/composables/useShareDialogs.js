import { ref } from "vue";

/**
 * 分享 / 导入弹窗
 *
 * 两个弹窗共用一份「当前预览的是编队还是合集」的状态，所以放在一起。
 * 生成码失败时不弹空窗，改用注入的 notify 提示——composable 自己不碰对话框。
 *
 * @param {(message: string) => void} notify 提示回调
 */
export function useShareDialogs(notify = () => {}) {
  const showShareModal = ref(false);
  const showImportModal = ref(false);
  const shareType = ref("");
  const shareCode = ref("");
  const currentShareTeam = ref(null);
  const currentShareCollection = ref(null);

  /**
   * 打开分享弹窗
   * @param {string} code 分享码
   * @param {Object} preview 预览对象（编队或合集）
   * @param {"team"|"collection"} type 预览类型
   * @returns {boolean} 是否打开；空码返回 false
   */
  const openShareModal = (code, preview, type) => {
    if (!code) {
      notify("生成分享码失败");
      return false;
    }
    shareCode.value = code;
    currentShareTeam.value = type === "team" ? preview : null;
    currentShareCollection.value = type === "collection" ? preview : null;
    shareType.value = type;
    showShareModal.value = true;
    return true;
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

  return {
    showShareModal,
    showImportModal,
    shareType,
    shareCode,
    currentShareTeam,
    currentShareCollection,
    openShareModal,
    closeShareModal,
    closeImportModal,
  };
}
