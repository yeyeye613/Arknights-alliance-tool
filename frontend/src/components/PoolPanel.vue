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
            v-for="name in MAIN_COVENANTS"
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
            v-for="name in SUB_COVENANTS"
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
        >
          <img
            :src="op.avatar"
            @error="handleImgError"
          />
          <span class="name-label">{{ op.name }}</span>
          <span class="tier-tag">{{ getOperatorTier(op) }}</span>
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
  import { ref, computed } from "vue";
  import { VueDraggable } from "vue-draggable-plus";

  import AddOpPanel from "./AddOpPanel.vue";
  import operatorsConfig from "../data/operators.json";
  import selfOpConfig from "../data/selfOp.json";
  import { handleImgError } from "@/utils/index.js";
  import { getAvatarUrl } from "@/utils/index.js";

  // 盟约常量
  const MAIN_COVENANTS = [
    "拉特兰",
    "维多利亚",
    "炎",
    "谢拉格",
    "萨尔贡",
    "叙拉古",
    "卡西米尔",
    "阿戈尔",
  ];
  const SUB_COVENANTS = [
    "精准",
    "迅捷",
    "灵巧",
    "奥术",
    "坚守",
    "助力",
    "远见",
    "奇迹",
    "投资人",
    "突袭",
    "不屈",
    "调和",
    "协防干员",
    "独行",
  ];

  // 筛选状态
  const searchQuery = ref("");
  const selectedTier = ref("");
  const selectedMainCov = ref("");
  const selectedSubCov = ref("");
  const showAddOpModal = ref(false);
  const selectedSelfOperators = ref([]);

  const emit = defineEmits(["addToTeam"]);

  // 干员池处理
  const baseOperators = Object.keys(operatorsConfig).map((name, index) => ({
    id: index,
    name,
    avatar: getAvatarUrl(name),
  }));

  const operatorPool = computed(() => {
    const selfOperators = selectedSelfOperators.value.map((op, index) => ({
      id: `self-${op.tier}-${op.name}-${index}`,
      ...op,
    }));
    return [...baseOperators, ...selfOperators];
  });

  const getOperatorConfig = (name) => {
    return operatorsConfig[name] || selfOpConfig[name];
  };

  const getOperatorTier = (op) => {
    return op.tier || getOperatorConfig(op.name)?.tier || "";
  };

  const filteredPool = computed(() => {
    return operatorPool.value.filter((op) => {
      const data = getOperatorConfig(op.name);
      if (!data) {
        return false;
      }
      const matchName = op.name.includes(searchQuery.value);
      const matchTier =
        selectedTier.value === "" || getOperatorTier(op) === selectedTier.value;
      const matchMainCov =
        selectedMainCov.value === "" ||
        data.covenants.includes(selectedMainCov.value);
      const matchSubCov =
        selectedSubCov.value === "" ||
        data.covenants.includes(selectedSubCov.value);
      return matchName && matchTier && matchMainCov && matchSubCov;
    });
  });

  const addToTeam = (op) => {
    emit("addToTeam", op);
  };

  const handleSelfOperatorsConfirm = (operators) => {
    selectedSelfOperators.value = operators;
    showAddOpModal.value = false;
  };
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
