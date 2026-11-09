/**
 * 游戏版本状态 Composables
 * 负责：当前版本（盟约 / 规程）的切换、持久化，以及版本对应的数据视图
 */
import { computed, ref } from "vue";
import {
  CORE_GROUP,
  ADDITIONAL_GROUP,
  DEFAULT_VERSION_ID,
  GAME_VERSIONS,
  getCovenantsByGroup,
  getGameVersion,
  isValidVersionId,
} from "@/data/versions.js";

const VERSION_STORAGE_KEY = "arknights_game_version";

function readStoredVersion() {
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    if (stored && isValidVersionId(stored)) {
      return stored;
    }
  } catch (error) {
    console.error("读取游戏版本缓存失败", error);
  }
  return DEFAULT_VERSION_ID;
}

// 模块级单例，保证所有组件共享同一份版本状态
const currentVersionId = ref(readStoredVersion());

export function useGameVersion() {
  const currentVersion = computed(() => getGameVersion(currentVersionId.value));

  const covenants = computed(() => currentVersion.value.covenants);

  const operators = computed(() => currentVersion.value.operators);

  const coreCovenants = computed(() =>
    getCovenantsByGroup(currentVersion.value, CORE_GROUP),
  );

  const additionalCovenants = computed(() =>
    getCovenantsByGroup(currentVersion.value, ADDITIONAL_GROUP),
  );

  /**
   * 切换游戏版本
   * @param {string} id - 版本 id
   * @returns {boolean} 是否切换成功
   */
  const setVersion = (id) => {
    if (!isValidVersionId(id) || id === currentVersionId.value) {
      return false;
    }
    currentVersionId.value = id;
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, id);
    } catch (error) {
      console.error("保存游戏版本失败", error);
    }
    return true;
  };

  return {
    versions: GAME_VERSIONS,
    currentVersionId,
    currentVersion,
    covenants,
    operators,
    coreCovenants,
    additionalCovenants,
    setVersion,
  };
}
