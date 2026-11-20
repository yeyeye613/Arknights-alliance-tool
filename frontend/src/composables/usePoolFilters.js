import { computed, onMounted, ref, watch } from "vue";

import { collectTraitOptions } from "@/domain/filterOperators";

/**
 * 干员池筛选状态
 *
 * 这里只做「状态 + 派生值」：筛选条件、三态 Ban、已选摘要、偏好读写。
 * 真正的匹配规则在 `domain/filterOperators.ts`（纯函数，可单独测试）。
 *
 * 偏好键暂时留在这里，P3 会迁到 infrastructure/storage 的 preferencesRepository。
 */
export const FILTER_VIEW_KEY = "arknights_pool_filter_view";
export const FILTER_COLLAPSED_KEY = "arknights_pool_filter_collapsed";

/**
 * @param {Object} context
 * @param {import("vue").Ref} context.currentVersion 当前版本（提供 banStrategy / operators）
 * @param {import("vue").Ref} context.currentVersionId 当前版本 id（变化时清理失效条件）
 * @param {import("vue").Ref} context.coreCovenants 核心盟约（阵营）
 * @param {import("vue").Ref} context.additionalCovenants 附加盟约
 */
export function usePoolFilters({
  currentVersion,
  currentVersionId,
  coreCovenants,
  additionalCovenants,
}) {
  const query = ref("");
  const tier = ref("");
  const mainCovenant = ref("");
  const subCovenant = ref("");
  const traitType = ref("");
  const traitTrigger = ref("");
  const banned = ref([]);

  /** 筛选区折叠 / 视图形态（持久化到 localStorage） */
  const collapsed = ref(false);
  const viewMode = ref("icon");

  /** 六个维度（另一个「维度」是 Ban，单独存 banned） */
  const filters = computed(() => ({
    query: query.value,
    tier: tier.value,
    mainCovenant: mainCovenant.value,
    subCovenant: subCovenant.value,
    traitType: traitType.value,
    traitTrigger: traitTrigger.value,
  }));

  const setters = {
    query: (value) => (query.value = value),
    tier: (value) => (tier.value = value),
    mainCovenant: (value) => (mainCovenant.value = value),
    subCovenant: (value) => (subCovenant.value = value),
    traitType: (value) => (traitType.value = value),
    traitTrigger: (value) => (traitTrigger.value = value),
  };

  /** 按维度写值（PoolFilters 的 set-filter 事件落到这里） */
  const setFilter = (key, value) => {
    setters[key]?.(value);
  };

  /**
   * 盟约三态切换（筛选与 Ban 合并，同一组按钮）：
   * 未选中 → 点一下 = 按该盟约筛选；已选中 → 再点一下 = Ban；
   * 已 Ban → 再点一下 = 取消 Ban。
   *
   * @param {"main"|"sub"} row `main` = 阵营行，`sub` = 盟约行
   * @param {string} name 盟约名
   */
  const toggleCov = (row, name) => {
    const key = row === "main" ? "mainCovenant" : "subCovenant";

    if (filters.value[key] === name) {
      setFilter(key, "");
      if (!banned.value.includes(name)) {
        banned.value = [...banned.value, name];
      }
      return;
    }
    if (banned.value.includes(name)) {
      banned.value = banned.value.filter((cov) => cov !== name);
      return;
    }
    setFilter(key, name);
  };

  /** 当前生效的筛选项摘要（`{ key, label }`，清除动作由 clearFilter 处理） */
  const activeFilterList = computed(() => {
    const list = [];
    if (tier.value) {
      list.push({ key: "tier", label: `${tier.value}阶` });
    }
    if (mainCovenant.value) {
      list.push({ key: "mainCovenant", label: mainCovenant.value });
    }
    if (subCovenant.value) {
      list.push({ key: "subCovenant", label: subCovenant.value });
    }
    if (traitType.value) {
      list.push({ key: "traitType", label: traitType.value });
    }
    if (traitTrigger.value) {
      list.push({ key: "traitTrigger", label: traitTrigger.value });
    }
    for (const cov of banned.value) {
      list.push({ key: `ban-${cov}`, label: `Ban ${cov}` });
    }
    return list;
  });

  /** 逐项取消：`ban-xxx` 走解禁，其余清空对应维度 */
  const clearFilter = (key) => {
    if (key.startsWith("ban-")) {
      const cov = key.slice(4);
      banned.value = banned.value.filter((item) => item !== cov);
      return;
    }
    setters[key]?.("");
  };

  const clearAllFilters = () => {
    tier.value = "";
    mainCovenant.value = "";
    subCovenant.value = "";
    traitType.value = "";
    traitTrigger.value = "";
    banned.value = [];
  };

  /** 当前版本出现的特质类型 / 触发时机选项 */
  const traitTypeOptions = computed(() =>
    collectTraitOptions(currentVersion.value, "type"),
  );
  const traitTriggerOptions = computed(() =>
    collectTraitOptions(currentVersion.value, "trigger"),
  );

  /** 当前版本可选的全部盟约（核心 + 附加），用于清理失效的 Ban 项 */
  const allCovenants = computed(() => [
    ...coreCovenants.value,
    ...additionalCovenants.value,
  ]);

  /**
   * Ban 状态：策略随版本切换
   * - 规程版（faction）：Ban 阵营 = 带该阵营的干员全部隐藏
   * - 盟约版（covenant，缺省）：干员的全部盟约都被 Ban 才隐藏
   */
  const banState = computed(() => ({
    banned: banned.value,
    strategy: currentVersion.value.banStrategy,
    coreCovenants: coreCovenants.value,
  }));

  // 切换版本时清理已失效的筛选条件
  watch(currentVersionId, () => {
    if (!coreCovenants.value.includes(mainCovenant.value)) {
      mainCovenant.value = "";
    }
    if (!additionalCovenants.value.includes(subCovenant.value)) {
      subCovenant.value = "";
    }
    if (!traitTypeOptions.value.includes(traitType.value)) {
      traitType.value = "";
    }
    if (!traitTriggerOptions.value.includes(traitTrigger.value)) {
      traitTrigger.value = "";
    }
    banned.value = banned.value.filter((cov) =>
      allCovenants.value.includes(cov),
    );
  });

  onMounted(() => {
    const savedView = localStorage.getItem(FILTER_VIEW_KEY);
    if (savedView === "icon" || savedView === "text") {
      viewMode.value = savedView;
    }
    collapsed.value = localStorage.getItem(FILTER_COLLAPSED_KEY) === "1";
  });

  watch(viewMode, (value) => {
    localStorage.setItem(FILTER_VIEW_KEY, value);
  });

  watch(collapsed, (value) => {
    localStorage.setItem(FILTER_COLLAPSED_KEY, value ? "1" : "0");
  });

  return {
    filters,
    banned,
    collapsed,
    viewMode,
    traitTypeOptions,
    traitTriggerOptions,
    activeFilterList,
    banState,
    setFilter,
    toggleCov,
    clearFilter,
    clearAllFilters,
  };
}
