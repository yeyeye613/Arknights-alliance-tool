<template>
  <div class="filter-panel">
    <div class="filter-head">
      <input
        :value="filters.query"
        placeholder="搜索干员..."
        class="search-input"
        @input="emit('set-filter', 'query', $event.target.value)"
      />

      <div class="head-actions">
        <button
          type="button"
          class="collapse-btn"
          :title="collapsed ? '展开筛选' : '收起筛选'"
          @click="emit('update:collapsed', !collapsed)"
        >
          {{ collapsed ? "筛选" : "收起" }}
          <span
            class="collapse-arrow"
            :class="{ expanded: !collapsed }"
            >▼</span
          >
        </button>

        <button
          type="button"
          class="add-btn"
          @click="emit('add-self-operator')"
        >
          自选干员
        </button>
      </div>
    </div>

    <!-- 折叠内容 -->
    <div
      v-show="!collapsed"
      class="filter-body"
    >
      <!-- 视图切换：只在筛选展开时出现 -->
      <div class="icon-filter-row view-row">
        <span class="row-label">视图</span>
        <div
          class="view-switch"
          role="group"
          aria-label="筛选展示方式"
        >
          <button
            type="button"
            class="view-btn"
            :class="{ active: viewMode === 'icon' }"
            title="图标筛选"
            @click="emit('update:viewMode', 'icon')"
          >
            图标
          </button>
          <button
            type="button"
            class="view-btn"
            :class="{ active: viewMode === 'text' }"
            title="文字筛选"
            @click="emit('update:viewMode', 'text')"
          >
            文字
          </button>
        </div>
      </div>

      <!-- 阶数 -->
      <div class="icon-filter-row">
        <span class="row-label">阶数</span>
        <div class="chip-list">
          <button
            v-for="item in TIERS"
            :key="item"
            type="button"
            class="chip tier-chip"
            :class="{ active: filters.tier === item }"
            :title="`${item} 阶干员`"
            @click="toggleTier(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <!-- 阵营 / 盟约：结构相同，交给 CovenantFilterRow 统一渲染 -->
      <CovenantFilterRow
        v-for="row in covenantRows"
        :key="row.key"
        :label="row.label"
        :names="row.names"
        :selected="row.selected"
        :banned="banned"
        :view-mode="viewMode"
        :hint="row.hint"
        @toggle="handleCovToggle(row.key, $event)"
        @hover="handleHover"
        @hover-move="handleHoverMove"
        @hover-leave="handleHoverLeave"
      />

      <!-- 特质 -->
      <div
        v-if="traitTypeOptions.length"
        class="icon-filter-row"
      >
        <span class="row-label">特质</span>
        <div class="chip-list">
          <button
            v-for="type in traitTypeOptions"
            :key="type"
            type="button"
            class="chip"
            :class="{ active: filters.traitType === type }"
            @click="toggleTrait('traitType', type)"
          >
            {{ type }}
          </button>
          <span class="chip-divider"></span>
          <button
            v-for="trigger in traitTriggerOptions"
            :key="trigger"
            type="button"
            class="chip trigger-chip"
            :class="{ active: filters.traitTrigger === trigger }"
            @click="toggleTrait('traitTrigger', trigger)"
          >
            {{ trigger }}
          </button>
        </div>
      </div>
    </div>

    <!-- 已选筛选摘要（折叠时也保留，便于知道当前生效条件） -->
    <div
      v-if="activeFilters.length > 0"
      class="active-filters"
    >
      <span class="active-label">已筛选</span>
      <button
        v-for="item in activeFilters"
        :key="item.key"
        type="button"
        class="active-chip"
        :title="`取消「${item.label}」`"
        @click="emit('clear-filter', item.key)"
      >
        {{ item.label }}
        <span class="active-x">×</span>
      </button>
      <button
        type="button"
        class="active-clear"
        @click="emit('clear-all')"
      >
        清除全部
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";

  import CovenantFilterRow from "@/features/roster/components/CovenantFilterRow.vue";
  import {
    hideCovenantTooltip,
    isCoarsePointer,
  } from "@/features/covenants";

  /**
   * 干员池筛选面板：搜索、视图切换、阶数、阵营、盟约、特质与已选摘要。
   *
   * 状态全在 `usePoolFilters`，这里只做渲染与事件上抛；
   * 三态 Ban 的判定也不在这里（`banned` 与 `selected` 一起才能决定下一步）。
   */
  const props = defineProps({
    /** 六个筛选维度的当前值 */
    filters: { type: Object, required: true },
    /** 已 Ban 的盟约名 */
    banned: { type: Array, default: () => [] },
    coreCovenants: { type: Array, default: () => [] },
    additionalCovenants: { type: Array, default: () => [] },
    traitTypeOptions: { type: Array, default: () => [] },
    traitTriggerOptions: { type: Array, default: () => [] },
    /** 已选条件摘要（`{ key, label }`） */
    activeFilters: { type: Array, default: () => [] },
    collapsed: Boolean,
    viewMode: { type: String, default: "icon" },
  });

  const emit = defineEmits([
    "set-filter",
    "toggle-cov",
    "update:collapsed",
    "update:viewMode",
    "clear-filter",
    "clear-all",
    "add-self-operator",
    "hover",
    "hover-move",
    "hover-leave",
  ]);

  const TIERS = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

  /** 两行盟约按钮：结构一致，只有标签 / 数据源 / 提示不同 */
  const covenantRows = computed(() =>
    [
      {
        key: "main",
        label: "阵营",
        names: props.coreCovenants,
        selected: props.filters.mainCovenant,
        hint: "",
      },
      {
        key: "sub",
        label: "盟约",
        names: props.additionalCovenants,
        selected: props.filters.subCovenant,
        hint: "点两下 Ban",
      },
    ].filter((row) => row.names.length > 0),
  );

  /** 触屏点按会同时触发 mouseenter，点完就收起提示，避免遮挡后续操作 */
  const dismissTooltipOnTouch = () => {
    if (isCoarsePointer()) {
      hideCovenantTooltip();
    }
  };

  const toggleTier = (value) => {
    dismissTooltipOnTouch();
    emit("set-filter", "tier", props.filters.tier === value ? "" : value);
  };

  const toggleTrait = (key, value) => {
    dismissTooltipOnTouch();
    emit("set-filter", key, props.filters[key] === value ? "" : value);
  };

  const handleCovToggle = (row, name) => {
    dismissTooltipOnTouch();
    emit("toggle-cov", row, name);
  };

  const handleHover = (name, event) => emit("hover", name, event);
  const handleHoverMove = (event) => emit("hover-move", event);
  const handleHoverLeave = () => emit("hover-leave");
</script>

<style scoped src="@/features/roster/components/filter-controls.css"></style>

<style scoped>
  /* 筛选面板 */
  .filter-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 12px;
    background: #1b1b1b;
    border: 1px solid #333;
    border-radius: 6px;
  }

  .filter-head {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .search-input {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 7px 8px;
    border-radius: 4px;
    font-size: 13px;
    flex: 1 1 110px;
    min-width: 0;
  }

  .head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  /* 图标 / 文字 切换 */
  .view-switch {
    display: inline-flex;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: hidden;
  }

  .view-btn {
    background: #2a2a2a;
    border: none;
    color: #888;
    font-size: 12px;
    padding: 6px 8px;
    cursor: pointer;
    line-height: 1;
  }

  .view-btn:hover {
    color: #ddd;
  }

  .view-btn.active {
    background: rgba(255, 207, 0, 0.18);
    color: #ffcf00;
  }

  .collapse-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #aaa;
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1;
    white-space: nowrap;
  }

  .collapse-btn:hover {
    color: #fff;
    border-color: #888;
  }

  .collapse-arrow {
    font-size: 9px;
    transition: transform 0.2s;
  }

  .collapse-arrow.expanded {
    transform: rotate(180deg);
  }

  .filter-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chip.trigger-chip {
    color: #9db8c9;
  }

  .chip.trigger-chip.active {
    background: rgba(110, 180, 220, 0.16);
    border-color: #6eb4dc;
    color: #6eb4dc;
  }

  /* 已选筛选摘要 */
  .active-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    width: 100%;
  }

  .active-label {
    font-size: 11px;
    color: #777;
    margin-right: 2px;
  }

  .active-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 207, 0, 0.14);
    border: 1px solid rgba(255, 207, 0, 0.5);
    color: #ffcf00;
    font-size: 11px;
    line-height: 1;
    padding: 4px 7px;
    border-radius: 10px;
    cursor: pointer;
  }

  .active-chip:hover {
    background: rgba(255, 207, 0, 0.24);
  }

  .active-x {
    font-size: 12px;
    opacity: 0.75;
  }

  .active-clear {
    background: transparent;
    border: none;
    color: #888;
    font-size: 11px;
    cursor: pointer;
    padding: 2px 4px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .active-clear:hover {
    color: #ccc;
  }

  .add-btn {
    background: #ffcf00;
    border: none;
    color: #121212;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .add-btn:hover {
    background: #ffdd44;
  }

  @media (max-width: 768px) {
    .filter-panel {
      gap: 8px;
      padding: 8px 10px;
    }

    .filter-head {
      gap: 6px;
    }

    .search-input {
      flex: 1 1 100%;
      padding: 8px 10px;
      font-size: 14px;
    }

    .head-actions {
      width: 100%;
      margin-left: 0;
      gap: 6px;
    }

    .view-btn,
    .collapse-btn {
      padding: 8px 10px;
      font-size: 12px;
    }

    .add-btn {
      margin-left: auto;
      padding: 8px 12px;
    }

    .active-chip {
      padding: 5px 8px;
    }
  }
</style>
