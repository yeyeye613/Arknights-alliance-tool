<template>
  <section class="operator-pool">
    <div class="panel-header column">
      <div class="filter-controls">
        <input
          v-model="searchQuery"
          placeholder="搜索干员名称..."
          class="search-input"
        />

        <select
          v-model="selectedTier"
          class="filter-select"
        >
          <option value="">阶数</option>
          <option
            v-for="t in ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ']"
            :key="t"
            :value="t"
          >
            {{ t }} 阶
          </option>
        </select>

        <select
          v-model="selectedMainCov"
          class="filter-select"
        >
          <option value="">阵营</option>
          <option
            v-for="name in coreCovenants"
            :key="name"
            :value="name"
          >
            {{ name }}
          </option>
        </select>
        <select
          v-model="selectedSubCov"
          class="filter-select"
        >
          <option value="">盟约</option>
          <option
            v-for="name in additionalCovenants"
            :key="name"
            :value="name"
          >
            {{ name }}
          </option>
        </select>
        <button
          type="button"
          class="add-btn"
          @click="showAddOpModal = true"
        >
          自选干员
        </button>
      </div>
    </div>
    <div class="drag-area scrollable">
      <VueDraggable
        v-model="filteredPool"
        :group="{ name: 'ops', pull: 'clone', put: false }"
        :sort="false"
        class="pool-grid"
      >
        <div
          v-for="op in filteredPool"
          :key="op.id"
          class="op-unit"
          @click="addToTeam(op)"
          @mouseenter="hoverTraits($event, op)"
          @mousemove="moveTraitTooltip"
          @mouseleave="hideTraitTooltip"
        >
          <img
            :src="op.avatar"
            @error="handleImgError"
          />
          <span class="name-label">{{ op.name }}</span>
          <span class="tier-tag">{{ getTier(op) }}</span>
          <span
            v-if="op.isSelfOperator"
            class="self-tag"
          >
            自选
          </span>
        </div>
      </VueDraggable>
    </div>

    <AddOpPanel
      :show="showAddOpModal"
      :selected-operators="selectedSelfOperators"
      @close="showAddOpModal = false"
      @confirm="handleSelfOperatorsConfirm"
    />
  </section>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { VueDraggable } from "vue-draggable-plus";

  import AddOpPanel from "./AddOpPanel.vue";
  import selfOpConfig from "../data/selfOp.json";
  import {
    getOperatorCovenants,
    getOperatorTier,
    getOperatorTraits,
  } from "@/data/versions.js";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import {
    showTraitTooltip,
    moveTraitTooltip,
    hideTraitTooltip,
  } from "@/composables/useTraitTooltip.js";
  import { handleImgError } from "@/utils/index.js";
  import { getAvatarUrl } from "@/utils/index.js";

  const {
    currentVersion,
    currentVersionId,
    coreCovenants,
    additionalCovenants,
  } = useGameVersion();

  // 筛选状态
  const searchQuery = ref("");
  const selectedTier = ref("");
  const selectedMainCov = ref("");
  const selectedSubCov = ref("");
  const showAddOpModal = ref(false);
  const selectedSelfOperators = ref([]);
  const SELF_OP_STORAGE_KEY = "arknights_selected_self_operators";

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
    const selfOperators = selectedSelfOperators.value.map((op, index) => ({
      id: `self-${op.tier}-${op.name}-${index}`,
      ...op,
    }));
    return [...baseOperators.value, ...selfOperators];
  });

  const getOperatorConfig = (name) => {
    return currentVersion.value.operators[name] || selfOpConfig[name];
  };

  const getTier = (op) => {
    return op.tier || getOperatorTier(op.name, currentVersion.value) || "";
  };

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

  const filteredPool = computed(() => {
    return operatorPool.value.filter((op) => {
      const data = getOperatorConfig(op.name);
      if (!data) {
        return false;
      }
      const covenants = getOperatorCovenants(op.name, currentVersion.value);
      const matchName = op.name.includes(searchQuery.value);
      const matchTier = selectedTier.value === "" || getTier(op) === selectedTier.value;
      const matchMainCov =
        selectedMainCov.value === "" || covenants.includes(selectedMainCov.value);
      const matchSubCov =
        selectedSubCov.value === "" || covenants.includes(selectedSubCov.value);
      return matchName && matchTier && matchMainCov && matchSubCov;
    });
  });

  // 切换版本时清理已失效的筛选条件
  watch(currentVersionId, () => {
    if (!coreCovenants.value.includes(selectedMainCov.value)) {
      selectedMainCov.value = "";
    }
    if (!additionalCovenants.value.includes(selectedSubCov.value)) {
      selectedSubCov.value = "";
    }
  });

  const addToTeam = (op) => {
    emit("addToTeam", op);
  };

  const handleSelfOperatorsConfirm = (operators) => {
    selectedSelfOperators.value = operators;
    showAddOpModal.value = false;
  };

  const normalizeSelfOperators = (operators) => {
    if (!Array.isArray(operators)) {
      return [];
    }

    return operators
      .filter((op) => selfOpConfig[op?.name] && ["Ⅴ", "Ⅵ"].includes(op?.tier))
      .map((op) => ({
        name: op.name,
        tier: op.tier,
        avatar: getAvatarUrl(op.name),
        isSelfOperator: true,
      }));
  };

  onMounted(() => {
    try {
      const saved = localStorage.getItem(SELF_OP_STORAGE_KEY);
      if (!saved) return;
      selectedSelfOperators.value = normalizeSelfOperators(JSON.parse(saved));
    } catch (error) {
      console.error("加载自选干员缓存失败", error);
      selectedSelfOperators.value = [];
    }
  });

  watch(
    selectedSelfOperators,
    (value) => {
      localStorage.setItem(SELF_OP_STORAGE_KEY, JSON.stringify(value));
    },
    { deep: true },
  );
</script>

<style scoped>
  /* 筛选区样式 */
  .panel-header {
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
  }

  .panel-header.column {
    flex-direction: column;
    gap: 12px;
  }

  .filter-controls {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(72px, 0.8fr)) auto;
    gap: 10px;
    width: 100%;
    align-items: center;
  }

  .search-input,
  .filter-select {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 8px;
    border-radius: 4px;
    font-size: 13px;
    min-width: 0;
  }

  .search-input {
    width: 100%;
  }

  /* 干员单元格 */
  .op-unit {
    position: relative;
    width: 75px;
    text-align: center;
    cursor: pointer;
  }

  .op-unit img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 4px;
    background: #222;
    display: block;
  }

  .name-label {
    font-size: 12px;
    display: block;
    margin-top: 5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .tier-tag {
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.8);
    color: #ffcf00;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 4px 0 4px 0;
  }

  .self-tag {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(255, 207, 0, 0.2);
    color: rgba(255, 240, 180, 0.88);
    font-size: 9px;
    font-weight: 500;
    line-height: 1;
    padding: 2px 3px;
    border: 1px solid rgba(255, 207, 0, 0.28);
    border-radius: 3px;
  }

  /* 拖拽区与网格 */
  .operator-pool {
    width: 30vw;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .drag-area {
    padding: 15px;
    background: #181818;
    border: 1px solid #333;
    min-height: 100px;
    max-height: 80vh;
    align-content: flex-start;
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
  }

  .add-btn {
    background: #ffcf00;
    border: none;
    color: #121212;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    white-space: nowrap;
  }

  .add-btn:hover {
    background: #ffdd44;
  }

  @media (max-width: 1280px) {
    .filter-controls {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .search-input {
      grid-column: span 2;
    }

    .add-btn {
      min-width: 0;
    }
  }

  @media (max-width: 1024px) {
    .operator-pool {
      width: 90vw;
    }

    .filter-controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .add-btn {
      grid-column: span 2;
    }
  }
</style>
