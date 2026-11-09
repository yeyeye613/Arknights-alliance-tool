<template>
  <teleport to="body">
    <div
      v-if="state.visible"
      ref="tipEl"
      class="trait-tooltip"
      :style="style"
    >
      <div class="tooltip-name">{{ state.name }}</div>
      <div
        v-if="state.covenants.length > 0"
        class="covenant-list"
      >
        <span
          v-for="cov in state.covenants"
          :key="cov"
          class="covenant-tag"
        >
          {{ cov }}
        </span>
      </div>
      <template v-if="state.traits.length > 0">
        <div
          v-for="(trait, i) in state.traits"
          :key="i"
          class="trait-item"
        >
          <div class="trait-head">
            <span class="trait-type">{{ trait.type || "特质" }}</span>
            <span
              v-if="trait.trigger"
              class="trait-trigger"
            >
              {{ trait.trigger }}
            </span>
          </div>
          <p class="trait-desc">
            <template
              v-for="(seg, si) in segments(trait.description)"
              :key="si"
            >
              <span
                v-if="seg.tag"
                class="inline-trigger"
                >{{ seg.value }}</span
              ><template v-else>{{ seg.value }}</template>
            </template>
          </p>
          <p
            v-if="trait.upgraded"
            class="trait-upgraded"
          >
            <span class="upgraded-tag">进阶后</span>
            <template v-if="trait.upgradedTrigger">
              <span class="inline-trigger">{{ trait.upgradedTrigger }}</span>
            </template>
            <template
              v-for="(seg, si) in segments(trait.upgraded)"
              :key="si"
            >
              <span
                v-if="seg.tag"
                class="inline-trigger"
                >{{ seg.value }}</span
              ><template v-else>{{ seg.value }}</template>
            </template>
          </p>
        </div>
      </template>
      <p
        v-else
        class="trait-empty"
      >
        暂无特质数据
      </p>
      <p
        v-if="state.note"
        class="tooltip-note"
      >
        {{ state.note }}
      </p>
    </div>
  </teleport>
</template>

<script setup>
  import { computed, nextTick, ref, watch } from "vue";
  import { useTraitTooltipState } from "@/composables/useTraitTooltip.js";

  const state = useTraitTooltipState();

  const tipEl = ref(null);
  const tipHeight = ref(0);

  /**
   * 把正文里的 <战斗中> 这类条件标记拆成片段，便于渲染成行内标签
   * @param {string} text - 原文
   * @returns {Array<{ tag: boolean, value: string }>}
   */
  const segments = (text) => {
    if (!text) {
      return [];
    }
    return String(text)
      .split(/(<[^<>]{1,12}>)/)
      .filter((part) => part !== "")
      .map((part) =>
        /^<[^<>]{1,12}>$/.test(part)
          ? { tag: true, value: part.slice(1, -1) }
          : { tag: false, value: part },
      );
  };

  /** 位置：贴住鼠标，超出视口底部时向上收 */
  const style = computed(() => {
    let top = state.y;
    if (tipHeight.value && top + tipHeight.value > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - tipHeight.value - 8);
    }
    return { left: `${state.x}px`, top: `${top}px` };
  });

  watch(
    () => [state.visible, state.name, state.traits],
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
  .trait-tooltip {
    position: fixed;
    z-index: 3000;
    width: 280px;
    max-width: calc(100vw - 16px);
    box-sizing: border-box;
    background: rgba(20, 20, 20, 0.96);
    border: 1px solid #555;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    padding: 10px 12px;
    color: #eee;
    font-size: 12px;
    line-height: 1.5;
    pointer-events: none;
  }

  .tooltip-name {
    font-size: 13px;
    font-weight: bold;
    color: #ffcf00;
    margin-bottom: 4px;
  }

  .covenant-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #3a3a3a;
  }

  .covenant-tag {
    background: rgba(255, 207, 0, 0.14);
    border: 1px solid rgba(255, 207, 0, 0.4);
    color: #ffd95e;
    font-size: 11px;
    line-height: 1.4;
    padding: 0 6px;
    border-radius: 3px;
    white-space: nowrap;
  }

  .trait-item + .trait-item {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #3a3a3a;
  }

  .trait-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .trait-type {
    background: #06587f;
    color: #cfe9ff;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
  }

  .trait-trigger {
    background: #3a3a3a;
    color: #ccc;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
  }

  .trait-desc,
  .trait-upgraded {
    margin: 0;
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.6;
    color: #ddd;
  }

  .inline-trigger {
    display: inline-block;
    background: rgba(6, 88, 127, 0.35);
    border: 1px solid rgba(120, 190, 235, 0.45);
    color: #9fd7f5;
    font-size: 10px;
    line-height: 1.4;
    padding: 0 4px;
    margin: 0 1px;
    border-radius: 3px;
    vertical-align: 1px;
    white-space: nowrap;
  }

  .trait-upgraded {
    margin-top: 4px;
    color: #b8e6b8;
  }

  .upgraded-tag {
    background: rgba(76, 175, 80, 0.18);
    border: 1px solid rgba(76, 175, 80, 0.5);
    color: #8fd98f;
    font-size: 10px;
    padding: 0 4px;
    border-radius: 3px;
    margin-right: 4px;
  }

  .trait-empty {
    margin: 0;
    color: #888;
  }

  .tooltip-note {
    margin: 6px 0 0;
    color: #ffb4b4;
    font-size: 11px;
  }
</style>
