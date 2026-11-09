<template>
  <div
    v-if="updateAvailable"
    class="pwa-update"
    role="status"
  >
    <span class="pwa-text">已发布新版本</span>
    <button
      type="button"
      class="pwa-btn primary"
      @click="applyUpdate"
    >
      立即刷新
    </button>
    <button
      type="button"
      class="pwa-btn"
      @click="dismissUpdate"
    >
      稍后
    </button>
  </div>
</template>

<script setup>
  import {
    updateAvailable,
    applyUpdate,
    dismissUpdate,
  } from "@/composables/usePwaUpdate";
</script>

<style scoped>
  .pwa-update {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    z-index: 2000;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: calc(100vw - 24px);
    padding: 10px 14px;
    background: #1f1f1f;
    border: 1px solid rgba(255, 207, 0, 0.45);
    border-radius: 24px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
    color: #ddd;
    font-size: 13px;
    animation: pwa-in 0.25s ease-out;
  }

  .pwa-text {
    color: #ffcf00;
    white-space: nowrap;
  }

  .pwa-btn {
    background: #2f2f2f;
    border: 1px solid #4a4a4a;
    color: #ccc;
    font-size: 12px;
    line-height: 1;
    padding: 7px 12px;
    border-radius: 14px;
    cursor: pointer;
    white-space: nowrap;
  }

  .pwa-btn:hover {
    color: #fff;
    border-color: #888;
  }

  .pwa-btn.primary {
    background: #ffcf00;
    border-color: #ffcf00;
    color: #121212;
    font-weight: bold;
  }

  .pwa-btn.primary:hover {
    background: #ffdd44;
    color: #121212;
  }

  @keyframes pwa-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @media (max-width: 768px) {
    .pwa-update {
      bottom: 16px;
      gap: 8px;
      padding: 8px 12px;
      font-size: 12px;
    }

    .pwa-btn {
      padding: 7px 10px;
    }
  }
</style>
