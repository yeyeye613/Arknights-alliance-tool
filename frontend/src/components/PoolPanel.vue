<template>
  <section class="operator-pool">
    <PoolFilters
      v-model:collapsed="filterCollapsed"
      v-model:view-mode="filterView"
      :filters="filters"
      :banned="bannedCovenants"
      :core-covenants="coreCovenants"
      :additional-covenants="additionalCovenants"
      :trait-type-options="traitTypeOptions"
      :trait-trigger-options="traitTriggerOptions"
      :active-filters="activeFilterList"
      @set-filter="setFilter"
      @toggle-cov="toggleCov"
      @clear-filter="clearFilter"
      @clear-all="clearAllFilters"
      @add-self-operator="showAddOpModal = true"
      @hover="(name, event) => showCovenantTooltip(event, name)"
      @hover-move="moveCovenantTooltip"
      @hover-leave="hideCovenantTooltip"
    />

    <!-- 小屏折叠开关：仅在移动端显示，用于把干员列表收起以腾出编队空间 -->
    <button
      type="button"
      class="pool-toggle"
      :class="{ collapsed: isPoolCollapsed }"
      :aria-expanded="!isPoolCollapsed"
      @click="togglePoolCollapse"
    >
      <span class="pool-toggle-title">干员池</span>
      <span class="pool-toggle-count">{{ filteredPool.length }}</span>
      <span class="pool-toggle-hint">{{
        isPoolCollapsed ? "已收起，点击展开" : "点击收起"
      }}</span>
      <span class="pool-toggle-arrow">▼</span>
    </button>

    <div
      v-show="!isPoolCollapsed"
      class="drag-area scrollable"
    >
      <VueDraggable
        v-model="filteredPool"
        :group="{ name: 'ops', pull: 'clone', put: false }"
        :sort="false"
        class="pool-grid"
        :disabled="isMobile"
      >
        <OperatorCard
          v-for="op in filteredPool"
          :key="op.id"
          :op="op"
          :tier="getTier(op)"
          pick-on="root"
          @pick="addToTeam(op)"
          @mouseenter="hoverTraits($event, op)"
          @mousemove="moveTraitTooltip"
          @mouseleave="hideTraitTooltip"
        />
      </VueDraggable>

      <div
        v-if="filteredPool.length === 0"
        class="pool-empty"
      >
        <p class="empty-title">没有符合条件的干员</p>
        <p class="empty-hint">减少或清除筛选条件试试</p>
      </div>
    </div>

    <AddOpPanel
      :show="showAddOpModal"
      :selected-operators="selfOperators"
      @close="showAddOpModal = false"
      @confirm="handleSelfOperatorsConfirm"
    />
  </section>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from "vue";
  import { VueDraggable } from "vue-draggable-plus";

  import AddOpPanel from "./AddOpPanel.vue";
  import OperatorCard from "./OperatorCard.vue";
  import PoolFilters from "./PoolFilters.vue";
  import { getOperatorCovenants, getOperatorTraits } from "@/data/versions.js";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import { usePoolFilters } from "@/composables/usePoolFilters.js";
  import { useSelfOperators } from "@/composables/useSelfOperators.js";
  import { filterOperators, resolveTier } from "@/domain/filterOperators";
  import {
    hideTraitTooltip,
    moveTraitTooltip,
    showTraitTooltip,
  } from "@/composables/useTraitTooltip.js";
  import {
    hideCovenantTooltip,
    moveCovenantTooltip,
    showCovenantTooltip,
  } from "@/composables/useCovenantTooltip.js";
  import { getAvatarUrl } from "@/utils/index.js";

  const {
    currentVersion,
    currentVersionId,
    coreCovenants,
    additionalCovenants,
  } = useGameVersion();

  /** 移动端断点，与样式中的媒体查询保持一致 */
  const MOBILE_QUERY = "(max-width: 1024px)";

  const {
    filters,
    banned: bannedCovenants,
    collapsed: filterCollapsed,
    viewMode: filterView,
    traitTypeOptions,
    traitTriggerOptions,
    activeFilterList,
    banState,
    setFilter,
    toggleCov,
    clearFilter,
    clearAllFilters,
  } = usePoolFilters({
    currentVersion,
    currentVersionId,
    coreCovenants,
    additionalCovenants,
  });

  const showAddOpModal = ref(false);
  const { selfOperators } = useSelfOperators();

  // 移动端：干员池折叠
  const isMobile = ref(false);
  const poolCollapsed = ref(false);
  /** 仅在移动端生效，桌面端始终展开 */
  const isPoolCollapsed = computed(
    () => isMobile.value && poolCollapsed.value,
  );
  let mobileMediaQuery = null;

  const togglePoolCollapse = () => {
    poolCollapsed.value = !poolCollapsed.value;
  };

  /** 视口跨过断点时同步状态：回到宽屏自动展开，避免“列表消失” */
  const handleViewportChange = (event) => {
    isMobile.value = event.matches;
    if (!event.matches) {
      poolCollapsed.value = false;
    }
  };

  const emit = defineEmits(["addToTeam"]);

  // 干员池处理
  const baseOperators = computed(() =>
    Object.keys(currentVersion.value.operators).map((name, index) => ({
      id: index,
      name,
      avatar: getAvatarUrl(name),
    })),
  );

  const operatorPool = computed(() => {
    const selfOps = selfOperators.value.map((op, index) => ({
      id: `self-${op.tier}-${op.name}-${index}`,
      ...op,
    }));
    return [...baseOperators.value, ...selfOps];
  });

  /** 显示等阶：自选干员自带 tier，其余按版本数据回退 */
  const getTier = (op) => resolveTier(op, currentVersion.value);

  /** 悬停展示干员特质与所属盟约 */
  const hoverTraits = (event, op) => {
    showTraitTooltip(
      event,
      op.name,
      getOperatorTraits(op.name, currentVersion.value),
      "",
      getOperatorCovenants(op.name, currentVersion.value),
    );
  };

  const filteredPool = computed(() =>
    filterOperators(
      operatorPool.value,
      filters.value,
      banState.value,
      currentVersion.value,
    ),
  );

  const addToTeam = (op) => {
    emit("addToTeam", op);
  };

  const handleSelfOperatorsConfirm = (operators) => {
    selfOperators.value = operators;
    showAddOpModal.value = false;
  };

  onMounted(() => {
    // 监听小屏断点，用于干员池折叠
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      mobileMediaQuery = window.matchMedia(MOBILE_QUERY);
      isMobile.value = mobileMediaQuery.matches;
      if (typeof mobileMediaQuery.addEventListener === "function") {
        mobileMediaQuery.addEventListener("change", handleViewportChange);
      } else {
        mobileMediaQuery.addListener?.(handleViewportChange);
      }
    }
  });

  onUnmounted(() => {
    if (!mobileMediaQuery) {
      return;
    }
    if (typeof mobileMediaQuery.removeEventListener === "function") {
      mobileMediaQuery.removeEventListener("change", handleViewportChange);
    } else {
      mobileMediaQuery.removeListener?.(handleViewportChange);
    }
    mobileMediaQuery = null;
  });
</script>

<style scoped>
  /* 拖拽区与网格 */
  .operator-pool {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* 移动端折叠开关：默认隐藏，仅小屏出现 */
  .pool-toggle {
    display: none;
  }

  .drag-area {
    padding: 15px;
    background: #181818;
    border: 1px solid #333;
    min-height: 100px;
    max-height: 80vh;
    align-content: flex-start;
    /* 仅在元素是滚动容器（overflow-y:auto/scroll）时生效，
       桌面端 .scrollable 会把它变成滚动区 */
    -webkit-overflow-scrolling: touch;
  }

  .pool-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 180px;
    color: #888;
    user-select: none;
  }

  .pool-empty .empty-title {
    margin: 0;
    font-size: 14px;
    color: #aaa;
  }

  .pool-empty .empty-hint {
    margin: 0;
    font-size: 12px;
    color: #666;
  }

  .pool-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    align-content: flex-start;
    width: 100%;
  }

  .scrollable {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  @media (max-width: 1024px) {
    .operator-pool {
      width: 100%;
    }

    /* 堆叠布局下取消内部滚动上限：展开的干员池随页面自然滚动，
       不再出现内部滚动区与页面滚动打架导致「溢出无法操作」。
       注意 .drag-area 同时带 .scrollable 类，必须同时覆盖 .scrollable，
       否则 .scrollable 的 overflow-y:auto 会让元素仍是内部滚动容器 */
    .drag-area,
    .scrollable {
      max-height: none;
      overflow-y: visible;
      /* flex:1 + min-height:0 在无固定高度的父级里会塌成很小的视口高度，
         使元素成为内部滚动区。移动端改为按内容自然高度 */
      flex: 0 0 auto;
      min-height: 0;
    }

    /* 干员池折叠条：堆叠布局时可用，把长列表收起腾出编队空间 */
    .pool-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 10px 12px;
      background: #1b1b1b;
      border: 1px solid #333;
      border-radius: 6px;
      color: #ccc;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      text-align: left;
    }

    .pool-toggle:active {
      background: #232323;
    }
    .pool-toggle-title {
      font-weight: bold;
      color: #eee;
    }

    .pool-toggle-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 20px;
      padding: 0 6px;
      background: rgba(255, 207, 0, 0.16);
      border: 1px solid rgba(255, 207, 0, 0.4);
      border-radius: 10px;
      color: #ffcf00;
      font-size: 11px;
      font-weight: bold;
    }

    .pool-toggle-hint {
      margin-left: auto;
      font-size: 11px;
      color: #777;
      white-space: nowrap;
    }

    .pool-toggle-arrow {
      font-size: 9px;
      color: #888;
      transition: transform 0.2s;
    }

    .pool-toggle.collapsed .pool-toggle-arrow {
      transform: rotate(-90deg);
    }

    .pool-toggle.collapsed .pool-toggle-hint {
      color: #999;
    }
  }

  @media (max-width: 768px) {
    .operator-pool {
      gap: 12px;
    }

    /* 干员网格：固定列宽改为自适应列 */
    .drag-area {
      padding: 10px;
      min-height: 80px;
    }

    .pool-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 10px 8px;
    }

    .pool-grid .op-unit {
      width: auto;
    }
  }

  @media (max-width: 420px) {
    .pool-toggle-hint {
      display: none;
    }

    .pool-grid {
      grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
      gap: 12px 8px;
    }
  }
</style>
