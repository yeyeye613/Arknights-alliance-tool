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

    <!-- 小屏折叠开关：仅在单列显示，用于把干员列表收起以腾出编队空间 -->
    <CollapseBar
      v-if="isMobile"
      title="干员池"
      :count="filteredPool.length"
      :collapsed="isPoolCollapsed"
      @toggle="togglePoolCollapse"
    />

    <!-- 触屏没有拖拽，交互改成「点一次看详情、点两次入队」，先说明再让人试 -->
    <p
      v-if="!canDrag && !isPoolCollapsed"
      class="pool-tap-hint"
    >
      轻点查看详情，双击加入编队
    </p>

    <div
      v-show="!isPoolCollapsed"
      class="drag-area scrollable"
    >
      <VueDraggable
        v-model="filteredPool"
        :group="{ name: 'ops', pull: 'clone', put: false }"
        :sort="false"
        class="pool-grid"
        :disabled="!canDrag"
      >
        <OperatorCard
          v-for="op in filteredPool"
          :key="operatorKey(op)"
          :op="op"
          :tier="getTier(op)"
          pick-on="root"
          @pick="handlePoolPick(op, $event)"
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

    <SelfOperatorDialog
      :show="showAddOpModal"
      :selected-operators="selfOperators"
      @close="showAddOpModal = false"
      @confirm="handleSelfOperatorsConfirm"
      @notify="emit('notify', $event)"
    />
  </section>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
  import { VueDraggable } from "vue-draggable-plus";

  import SelfOperatorDialog from "@/features/roster/components/SelfOperatorDialog.vue";
  import OperatorCard from "@/features/roster/components/OperatorCard.vue";
  import PoolFilters from "@/features/roster/components/PoolFilters.vue";
  import CollapseBar from "@/shared/components/CollapseBar.vue";
  import { getOperatorCovenants, getOperatorTraits } from "@/data/versions.js";
  import { useGameVersion } from "@/features/game-version";
  import { usePoolFilters } from "@/features/roster/composables/usePoolFilters.js";
  import { useSelfOperators } from "@/features/roster/composables/useSelfOperators.js";
  import { filterOperators, resolveTier } from "@/features/roster/domain/filterOperators";
  import {
    hideTraitTooltip,
    moveTraitTooltip,
    showTraitTooltip,
  } from "@/features/roster/composables/useTraitTooltip.js";
  import {
    hideCovenantTooltip,
    moveCovenantTooltip,
    showCovenantTooltip,
  } from "@/features/covenants";
  import { createOperatorInstance, operatorKey } from "@/entities/operator";
  import { useNarrowViewport } from "@/shared/composables/useNarrowViewport.js";
  import { useFinePointer } from "@/shared/composables/useFinePointer.js";

  const {
    currentVersion,
    currentVersionId,
    coreCovenants,
    additionalCovenants,
  } = useGameVersion();

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

  // 布局：单列才出现折叠条，与样式里的媒体查询同源
  const { isNarrow: isMobile } = useNarrowViewport();

  // 交互：拖动还是点按只看有没有鼠标——触屏即使排成两列也拖不准，
  // 长按拖拽还会抢走页面滚动，所以不再按宽度判断
  const { hasFinePointer } = useFinePointer();
  const canDrag = hasFinePointer;

  const poolCollapsed = ref(false);
  /** 折叠只在单列有意义，双列始终展开 */
  const isPoolCollapsed = computed(
    () => isMobile.value && poolCollapsed.value,
  );

  const togglePoolCollapse = () => {
    poolCollapsed.value = !poolCollapsed.value;
  };

  /** 回到双列时自动展开，避免「列表消失」 */
  watch(isMobile, (narrow) => {
    if (!narrow) {
      poolCollapsed.value = false;
    }
  });

  const emit = defineEmits(["addToTeam", "notify"]);

  // 干员池处理
  /** 版本池里的干员：等阶按版本数据回退，`getTier` 负责 */
  const baseOperators = computed(() =>
    Object.keys(currentVersion.value.operators).map((name) =>
      createOperatorInstance({ name }),
    ),
  );

  /** 自选干员自带等阶与来源标记，直接拼在后面——同名可共存（D3 决策） */
  const operatorPool = computed(() => [
    ...baseOperators.value,
    ...selfOperators.value,
  ]);

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

  /** 双击判定窗口：两次点击间隔小于它算双击 */
  const DOUBLE_TAP_MS = 320;
  /** 上一次点击的干员 key，用于识别双击 */
  let lastTap = { key: "", at: 0 };

  /**
   * 点按干员：有鼠标时一次点击就入队；
   * 触屏上第一次看详情，快速连点两次才入队。
   *
   * 双击的第二次点击立即入队，所以单击不必等判定窗口，
   * 不会出现「点完愣一下才出详情」。
   */
  const handlePoolPick = (op, event) => {
    if (canDrag.value) {
      addToTeam(op);
      return;
    }

    const key = operatorKey(op);
    const now = Date.now();
    const isDoubleTap = lastTap.key === key && now - lastTap.at < DOUBLE_TAP_MS;

    if (isDoubleTap) {
      lastTap = { key: "", at: 0 };
      hideTraitTooltip();
      addToTeam(op);
      return;
    }

    lastTap = { key, at: now };
    showTraitTooltip(
      event,
      op.name,
      getOperatorTraits(op.name, currentVersion.value),
      "",
      getOperatorCovenants(op.name, currentVersion.value),
      true,
    );
  };

  /** 详情由点击触发，触屏没有 mouseleave，改在点空白处关闭 */
  const hideDetailOnOutsideTap = (event) => {
    if (canDrag.value) return;
    const target = event.target;
    if (target instanceof Element && target.closest(".op-unit")) return;
    hideTraitTooltip();
  };

  const handleSelfOperatorsConfirm = (operators) => {
    selfOperators.value = operators;
    showAddOpModal.value = false;
  };

  onMounted(() => {
    document.addEventListener("pointerdown", hideDetailOnOutsideTap, true);
  });

  onUnmounted(() => {
    document.removeEventListener("pointerdown", hideDetailOnOutsideTap, true);
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

  /* 移动端折叠开关由 CollapseBar 渲染，这里只管列表区 */
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

  /* 单列操作提示：常驻一行小字，比一次性 toast 更不容易被忽略 */
  .pool-tap-hint {
    margin: 0;
    padding: 0 2px;
    font-size: 11px;
    line-height: 1.5;
    color: #777;
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

    /* 干员池折叠条由 CollapseBar 自带样式，这里只处理列表区的滚动与网格 */
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
    .pool-grid {
      grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
      gap: 12px 8px;
    }
  }
</style>
