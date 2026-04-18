<!-- 盟约展示界面 -->
<template>
  <section
    class="covenant-bar"
    v-if="presentCovList.length > 0"
  >
  <!-- TODO: 激活6维那种进阶效果要有特殊提示 -->
    <div
      v-for="name in presentCovList"
      :key="name"
      class="cov-item"
      :class="{
        'is-active':
          presentCovCounts[name] >= covenantsData[name].activateCount,
      }"
    >
      <div class="icon-wrapper">
        <img
          class="single-icon"
          :src="getIconUrl(name)"
          @error="handleImgError"
        />
        <span class="badge">{{ presentCovCounts[name] }}</span>
      </div>
      <span class="cov-name">{{ name }}</span>
    </div>
  </section>

  <!-- 未激活 -->
  <div
    v-else
    class="empty-hint"
  >
    暂无盟约激活，请添加干员
  </div>
</template>

<script setup>
  import covenantsData from "../data/covenants.json";
  import { handleImgError, getIconUrl } from "@/utils/index.js";

  const props = defineProps({
    presentCovList: {
      type: Array,
      required: true,
    },
    presentCovCounts: {
      type: Object,
      required: true,
    },
  });
</script>
<style>
  /* 盟约展示栏 */
  .covenant-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    background: #1a1a1a;
    padding: 15px;
    border: 1px solid #333;
    margin-bottom: 15px;
  }

  .cov-item {
    opacity: 0.4;
    filter: grayscale(1);
    transition: 0.3s;
    text-align: center;
    width: 45px;
  }

  .cov-item.is-active {
    opacity: 1;
    filter: grayscale(0);
    transform: scale(1.05);
  }

  .icon-wrapper {
    position: relative;
    width: 40px;
    margin: 0 auto;
  }

  .single-icon {
    max-width: 60px;
    max-height: 60px;
  }

  .badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: #ffcf00;
    color: #000;
    font-size: 10px;
    padding: 0 4px;
    border-radius: 2px;
    font-weight: bold;
  }

  .cov-name {
    font-size: 10px;
    margin-top: 5px;
    display: block;
    opacity: 0.8;
  }

  .empty-hint {
    color: #555;
    font-style: italic;
    font-size: 13px;
    margin-bottom: 15px;
  }
</style>
