<template>
  <BaseModal
    :show="show"
    title="导入自选干员"
    content-class="self-op-modal"
    @close="closeModal"
  >
    <div class="self-op-panel">
      <p class="desc">
        点击干员可在未选择、五阶、六阶之间切换。五阶和六阶分别最多选择 2 名。
      </p>

      <div class="toolbar">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索自选干员名称..."
        />
        <div class="toolbar-actions">
          <span class="count-tag">五阶 {{ selectedTierFive.length }}/2</span>
          <span class="count-tag">六阶 {{ selectedTierSix.length }}/2</span>
          <button
            type="button"
            class="clear-btn"
            :disabled="selectedTierFive.length === 0"
            @click="selectedTierFive = []"
          >
            清空五阶
          </button>
          <button
            type="button"
            class="clear-btn"
            :disabled="selectedTierSix.length === 0"
            @click="selectedTierSix = []"
          >
            清空六阶
          </button>
        </div>
      </div>

      <div class="operator-grid">
        <button
          v-for="name in filteredOperatorNames"
          :key="name"
          type="button"
          class="operator-card"
          :class="{
            active: getSelectedTier(name),
            'tier-five': getSelectedTier(name) === 'Ⅴ',
            'tier-six': getSelectedTier(name) === 'Ⅵ',
          }"
          @click="toggleSelection(name)"
        >
          <img
            :src="getAvatarUrl(name)"
            :alt="name"
          />
          <span>{{ name }}</span>
          <span
            v-if="getSelectedTier(name)"
            class="selected-tier-tag"
          >
            {{ getSelectedTier(name) }}
          </span>
        </button>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="btn cancel-btn"
        @click="closeModal"
      >
        取消
      </button>
      <button
        type="button"
        class="btn confirm-btn"
        @click="confirmSelection"
      >
        确认添加
      </button>
    </template>
  </BaseModal>
</template>
<script setup>
  import { computed, ref, watch } from "vue";

  import BaseModal from "./BaseModal.vue";
  import selfOpConfig from "../data/selfOp.json";
  import { getAvatarUrl } from "@/utils/index.js";

  const props = defineProps({
    show: Boolean,
    selectedOperators: {
      type: Array,
      default: () => [],
    },
  });

  const emit = defineEmits(["close", "confirm"]);

  const operatorNames = computed(() => Object.keys(selfOpConfig).sort());
  const selectedTierFive = ref([]);
  const selectedTierSix = ref([]);
  const searchQuery = ref("");

  const filteredOperatorNames = computed(() =>
    operatorNames.value.filter((name) => name.includes(searchQuery.value)),
  );

  const syncSelections = () => {
    const selected = props.selectedOperators || [];
    selectedTierFive.value = selected
      .filter((op) => op.tier === "Ⅴ")
      .map((op) => op.name);
    selectedTierSix.value = selected
      .filter((op) => op.tier === "Ⅵ")
      .map((op) => op.name);
  };

  watch(
    () => props.show,
    (value) => {
      if (value) {
        searchQuery.value = "";
        syncSelections();
      }
    },
    { immediate: true },
  );

  const getSelectedTier = (name) => {
    if (selectedTierFive.value.includes(name)) {
      return "Ⅴ";
    }
    if (selectedTierSix.value.includes(name)) {
      return "Ⅵ";
    }
    return "";
  };

  const toggleSelection = (name) => {
    const currentTier = getSelectedTier(name);

    if (currentTier === "") {
      if (selectedTierFive.value.length >= 2) {
        alert("五阶自选干员最多只能选择 2 名");
        return;
      }
      selectedTierFive.value.push(name);
      return;
    }

    if (currentTier === "Ⅴ") {
      if (selectedTierSix.value.length >= 2) {
        alert("六阶自选干员最多只能选择 2 名");
        return;
      }
      selectedTierFive.value = selectedTierFive.value.filter(
        (item) => item !== name,
      );
      selectedTierSix.value.push(name);
      return;
    }

    selectedTierSix.value = selectedTierSix.value.filter(
      (item) => item !== name,
    );
  };

  const confirmSelection = () => {
    const selectedOperators = [
      ...selectedTierFive.value.map((name) => ({
        name,
        tier: "Ⅴ",
        avatar: getAvatarUrl(name),
        isSelfOperator: true,
      })),
      ...selectedTierSix.value.map((name) => ({
        name,
        tier: "Ⅵ",
        avatar: getAvatarUrl(name),
        isSelfOperator: true,
      })),
    ];

    emit("confirm", selectedOperators);
  };

  const closeModal = () => {
    emit("close");
  };
</script>
<style scoped>
  .self-op-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .desc {
    margin: 0;
    color: #bbb;
    font-size: 13px;
    line-height: 1.5;
  }

  .toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-input {
    flex: 1 1 220px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 10px 12px;
    border-radius: 4px;
    font-size: 13px;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .clear-btn {
    background: transparent;
    border: 1px solid #555;
    color: #bbb;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: 0.2s;
  }

  .clear-btn:hover:not(:disabled) {
    border-color: #ffcf00;
    color: #ffcf00;
  }

  .clear-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .count-tag {
    color: #ffcf00;
    font-size: 12px;
    padding: 5px 8px;
    border-radius: 4px;
    background: #252525;
    border: 1px solid #333;
  }

  .operator-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
    gap: 10px;
  }

  .operator-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: #252525;
    border: 1px solid #333;
    border-radius: 6px;
    color: #fff;
    padding: 8px 6px;
    cursor: pointer;
    transition: 0.2s;
  }

  .operator-card:hover:not(:disabled) {
    border-color: #ffcf00;
    background: #2e2e2e;
  }

  .operator-card.active {
    border-color: #ffcf00;
    background: rgba(255, 207, 0, 0.12);
  }

  .operator-card.tier-five {
    border-color: #6ec1ff;
    background: rgba(110, 193, 255, 0.12);
  }

  .operator-card.tier-six {
    border-color: #ffcf00;
    background: rgba(255, 207, 0, 0.12);
  }

  .operator-card.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .operator-card img {
    width: 56px;
    height: 56px;
    object-fit: cover;
    border-radius: 4px;
    background: #333;
  }

  .operator-card span {
    font-size: 12px;
    text-align: center;
    line-height: 1.3;
    word-break: break-all;
  }

  .selected-tier-tag {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 10px;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 0 6px 0 6px;
    background: #ffcf00;
    color: #121212;
  }

  .operator-card.tier-five .selected-tier-tag {
    background: #6ec1ff;
    color: #121212;
  }

  .confirm-btn {
    background: #ffcf00;
    color: #121212;
  }

  .confirm-btn:hover {
    background: #ffdd44;
  }
</style>
