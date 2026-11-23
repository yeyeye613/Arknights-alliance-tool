<template>
  <button
    type="button"
    class="collapse-bar"
    :class="{ collapsed }"
    :aria-expanded="!collapsed"
    @click="emit('toggle')"
  >
    <span class="collapse-title">{{ title }}</span>
    <span
      v-if="count !== null && count !== undefined"
      class="collapse-count"
      >{{ count }}</span
    >
    <!-- 调用方可以塞一枚状态徽标（如「3 件待装备」） -->
    <slot />
    <span class="collapse-hint">{{
      collapsed ? expandHint : collapseHint
    }}</span>
    <span class="collapse-arrow">▼</span>
  </button>
</template>

<script setup>
  /**
   * 折叠条：长列表上方的一条「标题 + 数量 + 提示」。
   *
   * 只在窄屏渲染（由调用方 `v-if`），桌面端始终展开，不出现这条。
   * 数量放在条上，收起后仍知道有多少条，不会误以为列表空了。
   */
  defineProps({
    /** 折叠区的名字，如「干员池」「装备池」 */
    title: { type: String, required: true },
    /** 条数；不传则不显示徽标 */
    count: { type: [Number, String], default: null },
    collapsed: Boolean,
    /** 展开状态下的提示（点击它会怎样） */
    collapseHint: { type: String, default: "点击收起" },
    /** 收起状态下的提示 */
    expandHint: { type: String, default: "已收起，点击展开" },
  });

  const emit = defineEmits(["toggle"]);
</script>

<style scoped>
  .collapse-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    background: #1b1b1b;
    border: 1px solid #333;
    border-radius: 6px;
    color: #ccc;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    text-align: left;
  }

  .collapse-bar:active {
    background: #232323;
  }

  .collapse-title {
    font-weight: bold;
    color: #eee;
  }

  .collapse-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    background: rgba(255, 207, 0, 0.16);
    border: 1px solid rgba(255, 207, 0, 0.4);
    border-radius: 10px;
    color: #ffcf00;
    font-size: 11px;
    font-weight: bold;
  }

  .collapse-hint {
    margin-left: auto;
    font-size: 11px;
    color: #777;
    white-space: nowrap;
  }

  .collapse-bar.collapsed .collapse-hint {
    color: #999;
  }

  .collapse-arrow {
    font-size: 9px;
    color: #888;
    transition: transform 0.2s;
  }

  .collapse-bar.collapsed .collapse-arrow {
    transform: rotate(-90deg);
  }

  @media (max-width: 420px) {
    .collapse-hint {
      display: none;
    }
  }
</style>
