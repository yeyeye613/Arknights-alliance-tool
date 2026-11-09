<template>
  <section class="equipment-pool">
    <header class="equip-head">
      <span class="equip-title">装备池</span>
      <span class="equip-count">{{ filteredList.length }}</span>
      <span
        v-if="staged.length > 0"
        class="equip-staged"
        >{{ staged.length }} 件待装备</span
      >
    </header>

    <div class="equip-body">
      <input
        v-model="keyword"
        class="equip-search"
        type="text"
        placeholder="搜索装备..."
      />

      <div class="tier-chips">
        <button
          v-for="tier in TIER_OPTIONS"
          :key="tier.value"
          type="button"
          class="tier-chip"
          :class="{ active: tierFilter === tier.value }"
          @click="tierFilter = tier.value"
        >
          {{ tier.label }}
        </button>
      </div>

      <p class="equip-hint">
        点击放入编队下方的临时装备池，或直接把图标拖到干员头像上
      </p>

      <div class="equip-grid scrollable">
        <button
          v-for="item in filteredList"
          :key="item.name"
          type="button"
          class="equip-card"
          :class="{ staged: staged.includes(item.name) }"
          draggable="true"
          :title="`${item.name}｜${item.base}`"
          @dragstart="handleDragStart($event, item.name)"
          @click="emit('stage', item.name)"
        >
          <span class="card-icon">
            <img
              :src="getEquipmentIconUrl(item.name)"
              :alt="item.name"
              loading="lazy"
              @error="handleImgError"
            />
            <span class="card-tier">{{ TIER_LABELS[item.tier] }}</span>
          </span>
          <span class="card-name">{{ item.name }}</span>
          <span
            v-if="item.morph"
            class="card-morph"
            >{{ item.morph }}</span
          >
        </button>

        <p
          v-if="filteredList.length === 0"
          class="equip-empty"
        >
          没有匹配的装备
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import {
    TIER_LABELS,
    getEquipmentList,
  } from "@/data/equipment.js";
  import { getEquipmentIconUrl, handleImgError } from "@/utils/index.js";
  import { EQUIPMENT_DRAG_TYPE } from "@/composables/useEquipmentDrag.js";

  const props = defineProps({
    /** 已在临时装备池里的装备名，用于角标提示 */
    staged: { type: Array, default: () => [] },
  });

  const emit = defineEmits(["stage"]);

  const { currentVersion } = useGameVersion();

  const TIER_OPTIONS = [
    { value: 0, label: "全部" },
    ...[1, 2, 3, 4, 5, 6].map((value) => ({
      value,
      label: TIER_LABELS[value],
    })),
  ];

  const keyword = ref("");
  const tierFilter = ref(0);

  const allItems = computed(() => getEquipmentList(currentVersion.value));

  const filteredList = computed(() => {
    const key = keyword.value.trim();
    return allItems.value.filter((item) => {
      if (tierFilter.value && item.tier !== tierFilter.value) return false;
      if (!key) return true;
      return (
        item.name.includes(key) ||
        (item.base || "").includes(key) ||
        (item.advanced || "").includes(key)
      );
    });
  });

  /** 拖拽：交给编辑队面板的头像接收 */
  const handleDragStart = (event, name) => {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      EQUIPMENT_DRAG_TYPE,
      JSON.stringify({ name, from: "pool" }),
    );
    event.dataTransfer.setData("text/plain", name);
  };
</script>

<style scoped>
  .equipment-pool {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: #1b1b1b;
    border: 1px solid #333;
    border-radius: 6px;
    overflow: hidden;
  }

  .equip-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #2c2c2c;
  }

  .equip-title {
    font-size: 13px;
    font-weight: bold;
    color: #eee;
  }

  .equip-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    background: rgba(143, 224, 205, 0.14);
    border: 1px solid rgba(143, 224, 205, 0.35);
    border-radius: 10px;
    color: #8fe0cd;
    font-size: 11px;
    font-weight: bold;
  }

  .equip-staged {
    margin-left: auto;
    padding: 2px 8px;
    background: rgba(255, 207, 0, 0.12);
    border: 1px solid rgba(255, 207, 0, 0.4);
    border-radius: 9px;
    color: #ffcf00;
    font-size: 10px;
    line-height: 1.5;
  }

  .equip-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px 12px;
    min-height: 0;
    flex: 1;
  }

  .equip-search {
    width: 100%;
    box-sizing: border-box;
    padding: 7px 9px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #eee;
    font-size: 12px;
  }

  .equip-search:focus {
    outline: none;
    border-color: #8fe0cd;
  }

  .tier-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tier-chip {
    padding: 3px 8px;
    background: #2a2a2a;
    border: 1px solid #3d3d3d;
    border-radius: 10px;
    color: #aaa;
    font-size: 11px;
    line-height: 1.2;
    cursor: pointer;
  }

  .tier-chip:hover {
    color: #fff;
    border-color: #777;
  }

  .tier-chip.active {
    background: rgba(143, 224, 205, 0.16);
    border-color: #8fe0cd;
    color: #8fe0cd;
    font-weight: bold;
  }

  .equip-hint {
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: #777;
  }

  .equip-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 10px 8px;
    align-content: flex-start;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 0;
    padding-right: 2px;
  }

  .equip-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 4px 2px 5px;
    background: #222;
    border: 1px solid #333;
    border-radius: 5px;
    color: #ccc;
    cursor: grab;
    transition:
      border-color 0.15s,
      background 0.15s,
      transform 0.15s;
  }

  .equip-card:hover {
    border-color: #8fe0cd;
    background: #262f2c;
    transform: translateY(-1px);
  }

  .equip-card:active {
    cursor: grabbing;
  }

  .equip-card.staged {
    border-color: rgba(143, 224, 205, 0.6);
    background: rgba(143, 224, 205, 0.1);
  }

  .card-icon {
    position: relative;
    width: 64px;
    height: 64px;
    max-width: 100%;
  }

  .card-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 4px;
    background: #1a1a1a;
    display: block;
  }

  .card-tier {
    position: absolute;
    left: -2px;
    top: -2px;
    padding: 0 4px;
    background: rgba(0, 0, 0, 0.82);
    border-radius: 3px;
    color: #ffcf00;
    font-size: 10px;
    line-height: 15px;
  }

  .card-name {
    width: 100%;
    font-size: 11px;
    line-height: 1.25;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .card-morph {
    font-size: 9px;
    line-height: 1.2;
    padding: 0 4px;
    border-radius: 6px;
    color: #8fe0cd;
    background: rgba(143, 224, 205, 0.12);
  }

  .equip-empty {
    grid-column: 1 / -1;
    margin: 12px 0;
    text-align: center;
    color: #777;
    font-size: 12px;
  }

  @media (max-width: 768px) {
    .equip-grid {
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      max-height: none;
      min-height: 40vh;
    }

    .card-icon {
      width: 56px;
      height: 56px;
    }

    .equip-card {
      padding: 5px 2px;
    }
  }
</style>
