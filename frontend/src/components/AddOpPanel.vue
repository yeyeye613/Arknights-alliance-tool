<template>
  <BaseModal
    :show="show"
    title="导入自选干员"
    content-class="self-op-modal"
    @close="closeModal"
  >
    <div class="self-op-panel">
      <p class="desc">
        五阶和六阶自选干员分别最多选择 2 名，且同一名干员不能同时加入两个阶数。
      </p>

      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜索自选干员名称..."
      />

      <section class="tier-section">
        <div class="section-header">
          <h4>五阶自选</h4>
          <span>{{ selectedTierFive.length }}/2</span>
        </div>
        <div class="operator-grid">
          <button
            v-for="name in filteredOperatorNames"
            :key="`v-${name}`"
            type="button"
            class="operator-card"
            :class="{
              active: selectedTierFive.includes(name),
              disabled: isDisabled(name, 'Ⅴ'),
            }"
            :disabled="isDisabled(name, 'Ⅴ')"
            @click="toggleSelection('Ⅴ', name)"
          >
            <img
              :src="getAvatarUrl(name)"
              :alt="name"
            />
            <span>{{ name }}</span>
          </button>
        </div>
      </section>

      <section class="tier-section">
        <div class="section-header">
          <h4>六阶自选</h4>
          <span>{{ selectedTierSix.length }}/2</span>
        </div>
        <div class="operator-grid">
          <button
            v-for="name in filteredOperatorNames"
            :key="`vi-${name}`"
            type="button"
            class="operator-card"
            :class="{
              active: selectedTierSix.includes(name),
              disabled: isDisabled(name, 'Ⅵ'),
            }"
            :disabled="isDisabled(name, 'Ⅵ')"
            @click="toggleSelection('Ⅵ', name)"
          >
            <img
              :src="getAvatarUrl(name)"
              :alt="name"
            />
            <span>{{ name }}</span>
          </button>
        </div>
      </section>
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

  const isDisabled = (name, tier) => {
    if (tier === "Ⅴ") {
      return (
        selectedTierSix.value.includes(name) &&
        !selectedTierFive.value.includes(name)
      );
    }
    return (
      selectedTierFive.value.includes(name) &&
      !selectedTierSix.value.includes(name)
    );
  };

  const toggleSelection = (tier, name) => {
    const target =
      tier === "Ⅴ" ? selectedTierFive.value : selectedTierSix.value;
    const index = target.indexOf(name);

    if (index >= 0) {
      target.splice(index, 1);
      return;
    }

    if (target.length >= 2) {
      alert(`${tier}阶自选干员最多只能选择 2 名`);
      return;
    }

    target.push(name);
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

  .tier-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .search-input {
    width: 100%;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 10px 12px;
    border-radius: 4px;
    font-size: 13px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ffcf00;
  }

  .section-header h4 {
    margin: 0;
    font-size: 15px;
  }

  .operator-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
    gap: 10px;
  }

  .operator-card {
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

  .confirm-btn {
    background: #ffcf00;
    color: #121212;
  }

  .confirm-btn:hover {
    background: #ffdd44;
  }
</style>
