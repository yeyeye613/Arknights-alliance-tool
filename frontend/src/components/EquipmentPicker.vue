<template>
  <BaseModal
    :show="show"
    :title="`装备 · ${operatorName}`"
    content-class="equipment-modal"
    @close="$emit('close')"
  >
    <div class="equip-picker">
      <div class="slot-row">
        <button
          v-for="(name, index) in slots"
          :key="index"
          class="slot"
          :class="{ active: activeSlot === index, filled: Boolean(name) }"
          @click="activeSlot = index"
        >
          <span class="slot-label">槽位 {{ index + 1 }}</span>
          <span class="slot-value">{{ name || "空" }}</span>
          <span
            v-if="name"
            class="slot-clear"
            title="卸下"
            @click.stop="clearSlot(index)"
            >×</span
          >
        </button>
      </div>

      <p
        v-if="morphHint"
        class="morph-hint"
        :class="{ active: Boolean(morphCovenant) }"
      >
        {{ morphHint }}
      </p>

      <p
        v-if="combinedHint"
        class="combined-hint"
      >
        两件装备已组合为「{{ combinedHint }}」
      </p>

      <div class="filters">
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="搜索装备名称或效果..."
        />
        <div class="tier-chips">
          <button
            class="tier-chip"
            :class="{ active: tierFilter === 0 }"
            @click="tierFilter = 0"
          >
            全部
          </button>
          <button
            v-for="tier in tiers"
            :key="tier"
            class="tier-chip"
            :class="{ active: tierFilter === tier }"
            @click="tierFilter = tier"
          >
            {{ TIER_LABELS[tier] }}
          </button>
        </div>
      </div>

      <div class="equip-list">
        <button
          v-for="item in filteredList"
          :key="item.name"
          class="equip-item"
          :class="{ equipped: slots.includes(item.name) }"
          @click="pick(item.name)"
        >
          <div class="item-head">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-tier">{{ TIER_LABELS[item.tier] }}</span>
            <span class="item-price">{{ item.price }} 资金</span>
          </div>
          <p class="item-effect">{{ firstLine(item.base) }}</p>
          <span
            v-if="item.morph"
            class="item-badge"
          >
            盟约 · {{ item.morph }}
          </span>
          <span
            v-if="item.parts"
            class="item-badge combine"
          >
            组合装备
          </span>
        </button>

        <p
          v-if="filteredList.length === 0"
          class="empty-hint"
        >
          没有匹配的装备
        </p>
      </div>
    </div>

    <template #footer>
      <button
        class="btn cancel-btn"
        @click="clearAll"
      >
        全部卸下
      </button>
      <button
        class="btn confirm-btn"
        @click="$emit('close')"
      >
        完成
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import BaseModal from "./BaseModal.vue";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import {
    EQUIPMENT_SLOT_COUNT,
    MORPH_EQUIPMENT,
    TIER_LABELS,
    getCombinedEquipments,
    getEquipmentList,
    getMorphCovenant,
  } from "@/data/equipment.js";

  const props = defineProps({
    show: Boolean,
    operatorName: { type: String, default: "" },
    equipments: { type: Array, default: () => [] },
    initialSlot: { type: Number, default: 0 },
  });

  const emit = defineEmits(["close", "update:equipments"]);

  const { currentVersion } = useGameVersion();

  const keyword = ref("");
  const tierFilter = ref(0);
  const clampSlot = (value) =>
    Math.min(Math.max(value || 0, 0), EQUIPMENT_SLOT_COUNT - 1);
  // 组件通常随弹窗一起挂载，初始化时就要落在点击的那个槽位
  const activeSlot = ref(clampSlot(props.initialSlot));

  const tiers = [1, 2, 3, 4, 5, 6];

  /** 两个槽位，空槽用空串占位，保持位置 */
  const slots = computed(() => {
    const list = (props.equipments || []).filter(Boolean).slice(0, EQUIPMENT_SLOT_COUNT);
    while (list.length < EQUIPMENT_SLOT_COUNT) list.push("");
    return list;
  });

  // 打开时定位到点击的槽位，并重置筛选
  watch(
    () => props.show,
    (visible) => {
      if (!visible) return;
      keyword.value = "";
      tierFilter.value = 0;
      activeSlot.value = clampSlot(props.initialSlot);
    },
  );

  const allEquipments = computed(() => getEquipmentList(currentVersion.value));

  const filteredList = computed(() => {
    const key = keyword.value.trim();
    return allEquipments.value.filter((item) => {
      if (tierFilter.value && item.tier !== tierFilter.value) return false;
      if (!key) return true;
      return (
        item.name.includes(key) ||
        (item.base || "").includes(key) ||
        (item.advanced || "").includes(key)
      );
    });
  });

  const firstLine = (text) => (text || "").split("\n")[0];

  const morphCovenant = computed(() =>
    getMorphCovenant(props.equipments, currentVersion.value),
  );

  const morphHint = computed(() => {
    if (!props.equipments?.includes(MORPH_EQUIPMENT)) return "";
    if (morphCovenant.value) {
      return `变形同构体生效：视为【${morphCovenant.value}】盟约成员`;
    }
    return "变形同构体：再配一件带盟约的装备即可生效（如坚守盾牌、炎国短刀）";
  });

  const combinedHint = computed(() => {
    const combos = getCombinedEquipments(props.equipments, currentVersion.value);
    return combos.map((item) => item.name).join("、");
  });

  const apply = (next) => {
    emit("update:equipments", next.filter(Boolean));
  };

  const pick = (name) => {
    const next = [...slots.value];
    const existing = next.indexOf(name);

    if (existing >= 0) {
      next[existing] = "";
      apply(next);
      activeSlot.value = existing;
      return;
    }

    next[activeSlot.value] = name;
    apply(next);

    const empty = next.findIndex((value) => !value);
    if (empty >= 0) activeSlot.value = empty;
  };

  const clearSlot = (index) => {
    const next = [...slots.value];
    next[index] = "";
    apply(next);
    activeSlot.value = index;
  };

  const clearAll = () => {
    apply(["", ""]);
    activeSlot.value = 0;
  };
</script>

<style scoped>
  /* BaseModal 的容器不属于本组件的模板作用域，用 :global 命中 */
  :global(.modal-content.equipment-modal) {
    max-width: 640px;
  }

  .equip-picker {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .slot-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .slot {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    background: #262626;
    border: 1px dashed #4a4a4a;
    border-radius: 6px;
    color: #bbb;
    cursor: pointer;
    text-align: left;
    transition: 0.2s;
  }

  .slot.filled {
    border-style: solid;
    border-color: #4c6b3f;
    background: #22301f;
    color: #d8e8cf;
  }

  .slot.active {
    border-color: #ffcf00;
    box-shadow: 0 0 0 1px rgba(255, 207, 0, 0.35);
  }

  .slot-label {
    font-size: 10px;
    color: #888;
  }

  .slot-value {
    font-size: 13px;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .slot-clear {
    position: absolute;
    top: 4px;
    right: 6px;
    font-size: 15px;
    line-height: 1;
    color: #999;
  }

  .slot-clear:hover {
    color: #ff6b6b;
  }

  .morph-hint {
    margin: 0;
    padding: 6px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #9fb6c9;
    background: rgba(90, 140, 190, 0.12);
    border-radius: 4px;
  }

  .morph-hint.active {
    color: #c8b46a;
    background: rgba(255, 207, 0, 0.12);
  }

  .combined-hint {
    margin: 0;
    padding: 6px 10px;
    font-size: 12px;
    color: #8fb8d8;
    background: rgba(90, 140, 190, 0.12);
    border-radius: 4px;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .search-input {
    width: 100%;
    padding: 8px 10px;
    background: #252525;
    border: 1px solid #444;
    border-radius: 4px;
    color: #eee;
    font-size: 13px;
  }

  .search-input:focus {
    outline: none;
    border-color: #ffcf00;
  }

  .tier-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tier-chip {
    padding: 3px 10px;
    font-size: 12px;
    color: #aaa;
    background: #252525;
    border: 1px solid #3a3a3a;
    border-radius: 12px;
    cursor: pointer;
  }

  .tier-chip.active {
    color: #121212;
    background: #ffcf00;
    border-color: #ffcf00;
    font-weight: bold;
  }

  .equip-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
    max-height: 46vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .equip-item {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    background: #242424;
    border: 1px solid #383838;
    border-radius: 6px;
    color: #ddd;
    text-align: left;
    cursor: pointer;
    transition: 0.15s;
  }

  .equip-item:hover {
    border-color: #666;
    background: #2a2a2a;
  }

  .equip-item.equipped {
    border-color: #6f9a5a;
    background: #22301f;
  }

  .item-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .item-name {
    font-size: 13px;
    font-weight: 600;
  }

  .item-tier {
    font-size: 11px;
    color: #ffcf00;
  }

  .item-price {
    margin-left: auto;
    font-size: 11px;
    color: #888;
  }

  .item-effect {
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
    color: #9a9a9a;
  }

  .item-badge {
    align-self: flex-start;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    color: #c8b46a;
    background: rgba(255, 207, 0, 0.12);
  }

  .item-badge.combine {
    color: #8fb8d8;
    background: rgba(90, 140, 190, 0.15);
  }

  .empty-hint {
    grid-column: 1 / -1;
    margin: 12px 0;
    text-align: center;
    color: #777;
    font-size: 13px;
  }

  .confirm-btn {
    background: #ffcf00;
    color: #121212;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    .equip-list {
      grid-template-columns: 1fr;
      max-height: 40vh;
    }

    :global(.modal-content.equipment-modal) {
      max-width: 100%;
    }
  }
</style>
