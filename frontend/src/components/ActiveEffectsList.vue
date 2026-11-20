<template>
  <div
    v-if="activeCovList.length > 0"
    class="active-effects-wrap"
  >
    <div
      class="collapse-header"
      @click="isExpanded = !isExpanded"
    >
      <span>已激活效果详情 ({{ activeCovList.length }})</span>
      <span
        class="arrow"
        :class="{ rotated: isExpanded }"
        >▼</span
      >
    </div>
    <div
      v-show="isExpanded"
      class="collapse-content"
    >
      <ul>
        <li
          v-for="cov in activeCovList"
          :key="cov.name"
        >
          <span class="gold">【{{ cov.name }}】</span>
          <p
            v-for="(effect, i) in cov.effects"
            :key="i"
            class="activatedListDetails"
          >
            · {{ effect.condition }} {{ effect.description }}
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";

  /** 已激活盟约的效果明细：折叠块自身只维护展开态 */
  defineProps({
    /** useCovenantStats 的 activeCovList：{ name, effects[] }[] */
    activeCovList: { type: Array, default: () => [] },
  });

  const isExpanded = ref(false);
</script>

<style scoped>
  .active-effects-wrap {
    margin-top: auto;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1e1e1e;
  }

  .collapse-header {
    padding: 12px 15px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #252525;
  }

  .arrow {
    transition: 0.3s;
    font-size: 12px;
  }

  .arrow.rotated {
    transform: rotate(180deg);
  }

  .collapse-content {
    padding: 15px;
    max-height: 250px;
    overflow-y: auto;
  }

  .collapse-content ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .collapse-content li {
    margin-bottom: 12px;
    border-bottom: 1px solid #333;
    padding-bottom: 8px;
  }

  .collapse-content p {
    margin: 4px 0;
    font-size: 13px;
    color: #bbb;
    line-height: 1.4;
  }

  .gold {
    color: #ffcf00;
    font-weight: bold;
    margin-bottom: 5px;
    display: inline-block;
  }

  .activatedListDetails {
    text-align: left;
  }

  @media (max-width: 1024px) {
    /* 已激活效果详情：移动端取消 250px 内部滚动上限，
       随页面自然滚动，避免手指落在详情区时只滚详情不滚页面 */
    .collapse-content {
      max-height: none;
      overflow-y: visible;
    }
  }

  @media (max-width: 768px) {
    .collapse-header {
      padding: 10px 12px;
      font-size: 13px;
    }

    .collapse-content {
      padding: 12px;
      /* max-height 已在 1024 媒体查询中清除 */
    }

    .collapse-content p {
      font-size: 12px;
    }
  }
</style>
