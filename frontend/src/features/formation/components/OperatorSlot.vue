<template>
  <OperatorCard
    :op="op"
    :missing="missing"
    :drop-ready="dropReady"
    :drag-over="dragOver"
    pick-on="image"
    @pick="emit('pick')"
    @mouseenter="emit('hover', $event)"
    @mousemove="emit('move', $event)"
    @mouseleave="emit('leave')"
    @dragenter.prevent="emit('dragover', $event)"
    @dragover.prevent="emit('dragover', $event)"
    @dragleave="emit('dragleave', $event)"
    @drop.prevent="emit('drop', $event)"
  >
    <button
      type="button"
      class="remove-btn"
      @click.stop="emit('remove')"
    >
      ×
    </button>

    <!-- 装备角标：只显示已装备的槽位，点击卸下 -->
    <div
      v-if="equippedNames.length"
      class="equip-badges"
    >
      <span
        v-for="(equip, slot) in equippedNames"
        :key="slot"
        class="equip-badge"
        :title="`${equip}（点击卸下）`"
        @click.stop="emit('remove-equipment', slot)"
      >
        <img
          :src="getEquipmentIconUrl(equip)"
          :alt="equip"
          @error="handleImgError"
        />
      </span>
    </div>
  </OperatorCard>
</template>

<script setup>
  import { computed } from "vue";

  import { OperatorCard } from "@/features/roster";
  import { getOperatorEquipmentNames } from "@/features/equipment";
  import { getEquipmentIconUrl, handleImgError } from "@/shared/lib/assets.js";

  /**
   * 编队槽位：在 OperatorCard 上叠加「删除按钮 + 装备角标 + 拖放」。
   *
   * 拖拽与悬停一律以事件上抛，载荷解析与装配规则仍在 TeamPanel / domain；
   * 本组件不认识 equipToOperator，也不认识 props.team。
   */
  const props = defineProps({
    op: { type: Object, required: true },
    /** 不在当前版本干员池中 */
    missing: Boolean,
    /** 临时装备池有货，头像显示可放置提示 */
    dropReady: Boolean,
    /** 装备正拖到本槽位上 */
    dragOver: Boolean,
  });

  const emit = defineEmits([
    "pick",
    "remove",
    "remove-equipment",
    "hover",
    "move",
    "leave",
    "dragover",
    "dragleave",
    "drop",
  ]);

  /** 已装备的装备名（最多两个，空槽不占位） */
  const equippedNames = computed(() => getOperatorEquipmentNames(props.op));
</script>

<style scoped>
  .remove-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #ff4d4f;
    border: none;
    color: #fff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    cursor: pointer;
    font-weight: bold;
  }

  .equip-badges {
    position: absolute;
    left: 3px;
    bottom: 3px;
    display: flex;
    gap: 2px;
    pointer-events: none;
  }

  .equip-badge {
    position: relative;
    width: 20px;
    height: 20px;
    padding: 1px;
    box-sizing: border-box;
    background: rgba(10, 10, 10, 0.85);
    border: 1px solid #4c6b3f;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }

  .equip-badge img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 2px;
    background: #111;
  }

  .equip-badge:hover {
    border-color: #ff4d4f;
    transform: translateY(-1px);
  }

  .equip-badge:hover::after {
    content: "×";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 0, 0, 0.6);
    color: #ff8a8a;
    font-size: 13px;
    font-weight: bold;
    line-height: 1;
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    .equip-badge {
      width: 22px;
      height: 22px;
    }

    .equip-badges {
      left: 2px;
      bottom: 2px;
      gap: 3px;
    }

    .remove-btn {
      width: 22px;
      height: 22px;
      top: -8px;
      right: -8px;
      font-size: 14px;
      line-height: 1;
    }
  }
</style>
