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

        <select
          v-model="selectedTraitType"
          class="filter-select"
        >
          <option value="">特质类型</option>
          <option
            v-for="type in traitTypeOptions"
            :key="type"
            :value="type"
          >
            {{ type }}
          </option>
        </select>
        <select
          v-model="selectedTraitTrigger"
          class="filter-select"
        >
          <option value="">触发时机</option>
          <option
            v-for="trigger in traitTriggerOptions"
            :key="trigger"
            :value="trigger"
          >
            {{ trigger }}
          </option>
        </select>

        <div class="ban-filter">
          <button
            type="button"
            class="ban-toggle"
            :class="{ 'has-banned': bannedCovenants.length > 0 }"
            :title="bannedCovenants.length > 0 ? bannedCovenants.join('、') : 'Ban 盟约'"
            @click="banPanelOpen = !banPanelOpen"
          >
            <span
              v-if="bannedCovenants.length === 0"
              class="ban-label"
              >Ban盟约</span
            >
            <span
              v-else
              class="ban-badge"
              >{{ bannedCovenants.length }}</span
            >
          </button>
          <div
            v-if="banPanelOpen"
            class="ban-panel"
          >
            <div class="ban-panel-header">
              <span class="ban-panel-title">Ban 盟约（干员的全部盟约都被 Ban 才会隐藏）</span>
              <button
                v-if="bannedCovenants.length > 0"
                type="button"
                class="ban-clear"
                @click="bannedCovenants = []"
              >
                清空
              </button>
            </div>
            <div class="ban-options">
              <label
                v-for="cov in allCovenants"
                :key="cov"
                class="ban-option"
              >
                <input
                  type="checkbox"
                  :value="cov"
                  v-model="bannedCovenants"
                />
                {{ cov }}
              </label>
            </div>
          </div>
        </div>

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
  const selectedTraitType = ref("");
  const selectedTraitTrigger = ref("");
  const bannedCovenants = ref([]);
  const banPanelOpen = ref(false);
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

  /** 当前版本可选的全部盟约（核心 + 附加），供 Ban 列表使用 */
  const allCovenants = computed(() => [
    ...coreCovenants.value,
    ...additionalCovenants.value,
  ]);

  /** 当前版本出现的特质类型选项 */
  const traitTypeOptions = computed(() => {
    const types = new Set();
    for (const data of Object.values(currentVersion.value.operators)) {
      for (const trait of data.traits || []) {
        if (trait.type) {
          types.add(trait.type);
        }
      }
    }
    return [...types];
  });

  /** 当前版本出现的特质触发时机选项 */
  const traitTriggerOptions = computed(() => {
    const triggers = new Set();
    for (const data of Object.values(currentVersion.value.operators)) {
      for (const trait of data.traits || []) {
        if (trait.trigger) {
          triggers.add(trait.trigger);
        }
      }
    }
    return [...triggers];
  });

  /** Ban 判定：干员的全部盟约都被 Ban 才隐藏（无盟约的干员不受影响） */
  const isBanned = (covenants) =>
    bannedCovenants.value.length > 0 &&
    covenants.length > 0 &&
    covenants.every((cov) => bannedCovenants.value.includes(cov));

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
      const traits = getOperatorTraits(op.name, currentVersion.value);
      const matchName = op.name.includes(searchQuery.value);
      const matchTier = selectedTier.value === "" || getTier(op) === selectedTier.value;
      const matchMainCov =
        selectedMainCov.value === "" || covenants.includes(selectedMainCov.value);
      const matchSubCov =
        selectedSubCov.value === "" || covenants.includes(selectedSubCov.value);
      const matchTraitType =
        selectedTraitType.value === "" ||
        traits.some((trait) => trait.type === selectedTraitType.value);
      const matchTraitTrigger =
        selectedTraitTrigger.value === "" ||
        traits.some((trait) => trait.trigger === selectedTraitTrigger.value);
      return (
        matchName &&
        matchTier &&
        matchMainCov &&
        matchSubCov &&
        matchTraitType &&
        matchTraitTrigger &&
        !isBanned(covenants)
      );
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
    if (!traitTypeOptions.value.includes(selectedTraitType.value)) {
      selectedTraitType.value = "";
    }
    if (!traitTriggerOptions.value.includes(selectedTraitTrigger.value)) {
      selectedTraitTrigger.value = "";
    }
    bannedCovenants.value = bannedCovenants.value.filter((cov) =>
      allCovenants.value.includes(cov),
    );
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
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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

  /* 干员名不会太长，搜索栏固定窄宽 */
  .search-input {
    flex: 0 0 128px;
    width: 128px;
  }

  .filter-select {
    flex: 1 1 82px;
    max-width: 132px;
    padding: 8px 6px;
  }

  /* Ban 盟约 */
  .ban-filter {
    position: relative;
    flex: 0 0 auto;
  }

  .ban-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 34px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ccc;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    padding: 0 10px;
  }

  .ban-toggle:hover {
    border-color: #ff6b6b;
    color: #ffb4b4;
  }

  .ban-toggle.has-banned {
    border-color: rgba(255, 107, 107, 0.6);
    background: rgba(255, 107, 107, 0.12);
    padding: 0 6px;
  }

  .ban-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    background: #ff4d4f;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    border-radius: 10px;
    line-height: 1;
  }

  .ban-panel {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 60;
    width: 300px;
    max-width: 78vw;
    background: #202020;
    border: 1px solid #555;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    padding: 10px;
  }

  .ban-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .ban-panel-title {
    font-size: 12px;
    color: #aaa;
    line-height: 1.4;
  }

  .ban-clear {
    background: transparent;
    border: 1px solid #555;
    color: #bbb;
    font-size: 12px;
    border-radius: 3px;
    padding: 2px 8px;
    cursor: pointer;
    white-space: nowrap;
  }

  .ban-clear:hover {
    color: #fff;
    border-color: #999;
  }

  .ban-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px 8px;
  }

  .ban-option {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: #ddd;
    cursor: pointer;
    white-space: nowrap;
    padding: 2px;
  }

  .ban-option input {
    accent-color: #ff4d4f;
    cursor: pointer;
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
    padding: 8px 10px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .add-btn:hover {
    background: #ffdd44;
  }

  @media (max-width: 1280px) {
    .add-btn {
      min-width: 0;
    }

    .ban-panel {
      width: 280px;
    }
  }

  @media (max-width: 1024px) {
    .operator-pool {
      width: 90vw;
    }

    .search-input {
      flex: 1 1 120px;
    }
  }
</style>
