<template>
  <div class="icon-filter-row">
    <span class="row-label">{{ label }}</span>
    <span
      v-if="hint"
      class="cov-hint"
      >{{ hint }}</span
    >

    <!-- 图标形态 -->
    <div
      v-if="viewMode === 'icon'"
      class="icon-list"
    >
      <button
        v-for="name in names"
        :key="name"
        type="button"
        class="cov-icon"
        :class="{ active: selected === name, banned: banned.includes(name) }"
        @mouseenter="emit('hover', name, $event)"
        @mousemove="emit('hover-move', $event)"
        @mouseleave="emit('hover-leave')"
        @click="emit('toggle', name)"
      >
        <img
          :src="getIconUrl(name)"
          :alt="name"
          @error="handleImgError"
        />
      </button>
    </div>

    <!-- 文字形态 -->
    <div
      v-else
      class="chip-list"
    >
      <button
        v-for="name in names"
        :key="name"
        type="button"
        class="chip"
        :class="{ active: selected === name, banned: banned.includes(name) }"
        @mouseenter="emit('hover', name, $event)"
        @mousemove="emit('hover-move', $event)"
        @mouseleave="emit('hover-leave')"
        @click="emit('toggle', name)"
      >
        {{ name }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { handleImgError, getIconUrl } from "@/utils/index.js";

  /**
   * 一行盟约筛选按钮（阵营 / 附加盟约共用）。
   *
   * 只做渲染：三态切换（筛选 → Ban → 取消）的判定在 usePoolFilters 里，
   * 因为那需要同时读 selected 与 banned，属于状态机而不是展示逻辑。
   * 悬停效果浮层同理，向上抛事件由父级决定要不要弹。
   */
  defineProps({
    /** 行标签，如「阵营」「盟约」 */
    label: { type: String, required: true },
    /** 本行可选的盟约名 */
    names: { type: Array, required: true },
    /** 当前被选中用于筛选的盟约名 */
    selected: { type: String, default: "" },
    /** 已 Ban 的盟约名 */
    banned: { type: Array, default: () => [] },
    /** `icon` 图标形态 / `text` 文字形态 */
    viewMode: { type: String, default: "icon" },
    /** 行内提示文案（如「点两下 Ban」） */
    hint: { type: String, default: "" },
  });

  const emit = defineEmits([
    "toggle",
    "hover",
    "hover-move",
    "hover-leave",
  ]);
</script>

<style scoped src="./filter-controls.css"></style>

<style scoped>
  .icon-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    flex: 1;
    min-width: 0;
  }

  .cov-hint {
    font-size: 11px;
    color: #666;
    margin-left: 2px;
    white-space: nowrap;
  }

  /* Ban 态：筛选与 Ban 同一组按钮，样式必须与选中态明显区分 */
  .chip.banned {
    background: rgba(255, 77, 79, 0.14);
    border-color: #ff4d4f;
    color: #ff8a8c;
    text-decoration: line-through;
    text-decoration-color: rgba(255, 138, 140, 0.7);
  }

  .cov-icon {
    width: 32px;
    height: 32px;
    padding: 2px;
    background: #222;
    border: 1px solid #3a3a3a;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0.66;
    position: relative;
    transition:
      opacity 0.15s,
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .cov-icon img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: block;
    object-fit: contain;
  }

  .cov-icon:hover {
    opacity: 1;
    border-color: #888;
  }

  .cov-icon.active {
    opacity: 1;
    border-color: #ffcf00;
    box-shadow:
      0 0 0 1px #ffcf00,
      0 0 8px rgba(255, 207, 0, 0.35);
  }

  .cov-icon.banned {
    border-color: #ff4d4f;
    box-shadow:
      0 0 0 1px #ff4d4f,
      0 0 8px rgba(255, 77, 79, 0.35);
  }

  .cov-icon.banned img {
    filter: grayscale(1) brightness(0.55);
  }

  .cov-icon.banned::after {
    content: "\2715";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff6b6d;
    font-size: 16px;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .cov-hint {
      display: none;
    }

    .cov-icon {
      width: 34px;
      height: 34px;
    }
  }
</style>
