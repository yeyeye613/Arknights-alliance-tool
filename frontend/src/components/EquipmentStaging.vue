<template>
  <section
    class="equip-staging"
    :class="{ active: items.length > 0, pulse: pulsing }"
  >
    <header class="stage-head">
      <span class="stage-title">临时装备池</span>
      <span
        v-if="items.length > 0"
        class="stage-count"
        >{{ items.length }}</span
      >
      <span class="stage-hint">{{
        items.length > 0
          ? "拖到上方干员头像上装备，或先点装备再点干员"
          : "在「装备池」里点装备，就会落到这里"
      }}</span>
      <button
        v-if="items.length > 0"
        type="button"
        class="stage-clear"
        @click="emit('clear')"
      >
        清空
      </button>
    </header>

    <div
      v-if="items.length > 0"
      class="stage-row"
    >
      <button
        v-for="name in items"
        :key="name"
        type="button"
        class="stage-item"
        :class="{ selected: selected === name }"
        draggable="true"
        :title="`${name}：拖到干员头像上装备，点击可选中`"
        @dragstart="handleDragStart($event, name)"
        @click="emit('select', name)"
      >
        <img
          :src="getEquipmentIconUrl(name)"
          :alt="name"
          @error="handleImgError"
        />
        <span class="stage-name">{{ name }}</span>
        <span
          class="stage-remove"
          title="移出临时装备池"
          @click.stop="emit('remove', name)"
          >×</span
        >
      </button>
    </div>

    <p
      v-else
      class="stage-empty"
    >
      这里会暂存「装备池」里点选的装备，方便拖到上方干员
    </p>
  </section>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { getEquipmentIconUrl, handleImgError } from "@/utils/index.js";
  import { EQUIPMENT_DRAG_TYPE } from "@/composables/useEquipmentDrag.js";

  const props = defineProps({
    items: { type: Array, default: () => [] },
    selected: { type: String, default: "" },
  });

  const emit = defineEmits(["select", "remove", "clear"]);

  /** 新装备进入时轻微闪一下，提示用户接下来该拖到干员上 */
  const pulsing = ref(false);
  let pulseTimer = null;

  watch(
    () => props.items.length,
    (next, prev = 0) => {
      if (next <= prev) return;
      pulsing.value = true;
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => {
        pulsing.value = false;
      }, 1600);
    },
  );

  const handleDragStart = (event, name) => {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      EQUIPMENT_DRAG_TYPE,
      JSON.stringify({ name, from: "staging" }),
    );
    event.dataTransfer.setData("text/plain", name);
  };
</script>

<style scoped>
  .equip-staging {
    flex: 0 0 auto;
    padding: 8px 10px 10px;
    background: #1b1b1b;
    border: 1px dashed #3a3a3a;
    border-radius: 6px;
    transition:
      border-color 0.25s,
      box-shadow 0.25s;
  }

  .equip-staging.active {
    border-style: solid;
    border-color: rgba(143, 224, 205, 0.45);
  }

  .equip-staging.pulse {
    border-color: #8fe0cd;
    box-shadow: 0 0 0 1px rgba(143, 224, 205, 0.5),
      0 0 12px rgba(143, 224, 205, 0.25);
    animation: stagePulse 0.9s ease-out 2;
  }

  @keyframes stagePulse {
    0% {
      box-shadow: 0 0 0 1px rgba(143, 224, 205, 0.6),
        0 0 0 rgba(143, 224, 205, 0);
    }
    60% {
      box-shadow: 0 0 0 2px rgba(143, 224, 205, 0.28),
        0 0 16px rgba(143, 224, 205, 0.28);
    }
    100% {
      box-shadow: 0 0 0 1px rgba(143, 224, 205, 0.5),
        0 0 4px rgba(143, 224, 205, 0.15);
    }
  }

  .stage-head {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .stage-title {
    font-size: 12px;
    font-weight: bold;
    color: #ddd;
    white-space: nowrap;
  }

  .stage-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: rgba(143, 224, 205, 0.16);
    border: 1px solid rgba(143, 224, 205, 0.4);
    border-radius: 9px;
    color: #8fe0cd;
    font-size: 10px;
    font-weight: bold;
  }

  .stage-hint {
    flex: 1;
    min-width: 0;
    font-size: 10px;
    color: #777;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .stage-clear {
    flex: 0 0 auto;
    padding: 3px 7px;
    background: transparent;
    border: 1px solid #4a4a4a;
    border-radius: 3px;
    color: #999;
    font-size: 10px;
    cursor: pointer;
  }

  .stage-clear:hover {
    color: #ff8a8a;
    border-color: #a55;
  }

  .stage-row {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .stage-item {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 58px;
    padding: 4px 3px;
    background: #232323;
    border: 1px solid #3a3a3a;
    border-radius: 5px;
    color: #ccc;
    cursor: grab;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .stage-item:hover {
    border-color: #8fe0cd;
  }

  .stage-item.selected {
    border-color: #ffcf00;
    background: rgba(255, 207, 0, 0.12);
    box-shadow: 0 0 0 1px rgba(255, 207, 0, 0.35);
  }

  .stage-item img {
    width: 36px;
    height: 36px;
    object-fit: contain;
    border-radius: 3px;
    background: #1a1a1a;
    display: block;
  }

  .stage-name {
    width: 100%;
    font-size: 9px;
    line-height: 1.2;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .stage-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3a3a3a;
    border: 1px solid #555;
    border-radius: 50%;
    color: #bbb;
    font-size: 11px;
    line-height: 1;
  }

  .stage-remove:hover {
    background: #ff4d4f;
    border-color: #ff4d4f;
    color: #fff;
  }

  .stage-empty {
    margin: 6px 0 0;
    font-size: 10px;
    color: #666;
  }

  @media (max-width: 768px) {
    .stage-empty {
      font-size: 11px;
    }

    .stage-item {
      width: 62px;
    }

    .stage-item img {
      width: 40px;
      height: 40px;
    }
  }
</style>
