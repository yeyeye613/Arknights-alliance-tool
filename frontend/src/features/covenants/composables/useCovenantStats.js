/**
 * 盟约统计 Composables（薄封装）
 *
 * 计算逻辑全部在 `src/domain/covenantStats.ts`，这里只负责
 * 「把 ref 变成 computed」这一层响应式胶水。
 */
import { computed, unref } from "vue";
import { getGameVersion } from "@/data/versions.js";
import {
  computeCovenantStats,
  listCoreCovenants,
} from "@/features/covenants/domain/covenantStats";
import { useGameVersion } from "@/features/game-version/composables/useGameVersion.js";

/**
 * @param {import("vue").Ref<Array>} teamRef - 编队的响应式引用
 * @param {Object|string|import("vue").Ref<Object|string>} [versionSource] - 版本数据或版本 id。
 *   不传时回退到全局当前版本（历史行为，遗留调用方仍在用；新代码请显式传参，
 *   否则测试会与全局单例顺序耦合）。
 * @returns {Object} 盟约相关的响应式数据
 */
export function useCovenantStats(teamRef, versionSource) {
  const { currentVersion } = useGameVersion();

  const version = computed(() => {
    if (!versionSource) {
      return currentVersion.value;
    }
    const resolved = unref(versionSource);
    return resolved?.covenants ? resolved : getGameVersion(resolved);
  });

  // 一次遍历算出全部指标，避免每个 computed 各扫一遍编队
  const stats = computed(() =>
    computeCovenantStats(teamRef?.value, version.value),
  );

  return {
    covenantsData: computed(() => version.value.covenants || {}),
    coreCovenants: computed(() => listCoreCovenants(version.value)),
    // 所有盟约的人数 { 拉特兰: 2, 精准: 1 }
    presentCovCounts: computed(() => stats.value.counts),
    // 出现的盟约名称（激活的排在前面）
    presentCovList: computed(() => stats.value.presentList),
    // 已激活盟约详情
    activeCovList: computed(() => stats.value.activeList),
    advancedCovLevels: computed(() => stats.value.advancedLevels),
    // 变形同构体为各盟约贡献的人数
    morphCovCounts: computed(() => stats.value.morphCounts),
  };
}
