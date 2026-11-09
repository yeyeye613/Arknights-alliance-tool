<template>
  <teleport to="body">
    <div
      v-if="state.visible"
      ref="tipEl"
      class="covenant-tooltip"
      :style="style"
    >
      <div class="tip-head">
        <span class="tip-name">{{ state.name }}</span>
        <span
          v-if="groupLabel"
          class="group-tag"
          :class="{ additional: covenant?.group !== 'core' }"
          >{{ groupLabel }}</span
        >
      </div>

      <div
        v-if="covenant"
        class="tip-meta"
      >
        <span class="meta-item">激活 {{ covenant.activateCount }} 名</span>
        <span
          v-if="state.presentCount !== null"
          class="meta-item"
          :class="{ reached: state.presentCount >= covenant.activateCount }"
        >
          编队 {{ state.presentCount }} 名
        </span>
        <span
          v-if="state.advanced > 0"
          class="meta-item advanced"
          >进阶 Lv.{{ state.advanced }}</span
        >
        <span
          v-if="state.morphCount > 0"
          class="meta-item morph"
          title="变形同构体提供的额外盟约成员"
          >变形同构体 +{{ state.morphCount }}</span
        >
      </div>

      <div
        v-if="covenant && covenant.effects?.length"
        class="effect-list"
      >
        <div
          v-for="(effect, index) in covenant.effects"
          :key="index"
          class="effect-item"
        >
          <div class="effect-head">
            <span
              class="effect-type"
              :class="typeClass(effect.type)"
              >{{ effect.type }}</span
            >
            <span
              v-if="effect.condition"
              class="effect-condition"
              >{{ effect.condition }}</span
            >
          </div>
          <p class="effect-desc">{{ effect.description }}</p>
        </div>
      </div>

      <p
        v-else
        class="tip-empty"
      >
        暂无该盟约的效果数据
      </p>
    </div>
  </teleport>
</template>

<script setup>
  import { computed, nextTick, ref, watch } from "vue";
  import { useCovenantTooltipState } from "@/composables/useCovenantTooltip.js";
  import { useGameVersion } from "@/composables/useGameVersion.js";

  const state = useCovenantTooltipState();
  const { covenants } = useGameVersion();

  const tipEl = ref(null);
  const tipHeight = ref(0);

  /** 当前悬停的盟约数据（版本切换后仍按名字取最新数据） */
  const covenant = computed(() => covenants.value[state.name] || null);

  const groupLabel = computed(() => {
    if (!covenant.value) {
      return "";
    }
    return covenant.value.group === "core" ? "核心盟约" : "附加盟约";
  });

  /** 不同效果类型使用不同配色，便于快速定位基础 / 在场 / 层数效果 */
  const TYPE_CLASS = {
    基础效果: "type-base",
    在场效果: "type-present",
    层数效果: "type-stack",
    条件效果: "type-conditional",
  };
  const typeClass = (type) => TYPE_CLASS[type] || "type-default";

  /** 位置：贴住鼠标，超出视口底部时向上收 */
  const style = computed(() => {
    let top = state.y;
    if (tipHeight.value && top + tipHeight.value > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - tipHeight.value - 8);
    }
    return { left: `${state.x}px`, top: `${top}px` };
  });

  watch(
    () => [state.visible, state.name],
    async () => {
      if (!state.visible) {
        return;
      }
      await nextTick();
      tipHeight.value = tipEl.value?.offsetHeight || 0;
    },
  );
</script>

<style scoped>
  .covenant-tooltip {
    position: fixed;
    z-index: 3000;
    width: 300px;
    max-width: calc(100vw - 16px);
    max-height: calc(100vh - 24px);
    overflow-y: auto;
    box-sizing: border-box;
    background: rgba(20, 20, 20, 0.97);
    border: 1px solid #555;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    padding: 10px 12px;
    color: #eee;
    font-size: 12px;
    line-height: 1.5;
    text-align: left;
    pointer-events: none;
  }

  .tip-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .tip-name {
    font-size: 13px;
    font-weight: bold;
    color: #ffcf00;
  }

  .group-tag {
    background: rgba(255, 207, 0, 0.14);
    border: 1px solid rgba(255, 207, 0, 0.45);
    color: #ffd95e;
    font-size: 10px;
    line-height: 1.5;
    padding: 0 5px;
    border-radius: 3px;
  }

  .group-tag.additional {
    background: rgba(110, 180, 220, 0.14);
    border-color: rgba(110, 180, 220, 0.45);
    color: #9fd7f5;
  }

  .tip-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-bottom: 7px;
    margin-bottom: 7px;
    border-bottom: 1px solid #3a3a3a;
    color: #999;
    font-size: 11px;
  }

  .meta-item.reached {
    color: #8fd98f;
  }

  .meta-item.advanced {
    color: #c0a6ff;
  }

  .meta-item.morph {
    color: #7fd6c2;
  }

  .effect-item + .effect-item {
    margin-top: 7px;
    padding-top: 7px;
    border-top: 1px solid #333;
  }

  .effect-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 3px;
  }

  .effect-type {
    font-size: 10px;
    line-height: 1.6;
    padding: 0 5px;
    border-radius: 3px;
    white-space: nowrap;
  }

  .type-base {
    background: rgba(255, 207, 0, 0.16);
    border: 1px solid rgba(255, 207, 0, 0.4);
    color: #ffd95e;
  }

  .type-present {
    background: rgba(110, 180, 220, 0.16);
    border: 1px solid rgba(110, 180, 220, 0.4);
    color: #9fd7f5;
  }

  .type-stack {
    background: rgba(190, 110, 255, 0.16);
    border: 1px solid rgba(190, 110, 255, 0.42);
    color: #d3b3ff;
  }

  .type-conditional {
    background: rgba(76, 175, 80, 0.16);
    border: 1px solid rgba(76, 175, 80, 0.42);
    color: #9fe0a0;
  }

  .type-default {
    background: #333;
    border: 1px solid #4a4a4a;
    color: #ccc;
  }

  .effect-condition {
    font-size: 11px;
    color: #bbb;
  }

  .effect-desc {
    margin: 0;
    color: #ddd;
    line-height: 1.6;
    overflow-wrap: break-word;
  }

  .tip-empty {
    margin: 0;
    color: #888;
  }
</style>
