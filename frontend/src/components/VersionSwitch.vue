<!-- 游戏版本切换 -->
<template>
  <div class="version-switch">
    <span class="version-label">版本</span>
    <div class="version-options">
      <button
        v-for="version in versions"
        :key="version.id"
        type="button"
        class="version-btn"
        :class="{ active: version.id === currentVersionId }"
        :title="`${version.desc}\n数据来源：${version.source}`"
        @click="handleSelect(version.id)"
      >
        <span class="version-name">{{ version.label }}</span>
        <span
          v-if="version.badge"
          class="version-badge"
          >{{ version.badge }}</span
        >
      </button>
    </div>
  </div>
</template>

<script setup>
  import { useGameVersion } from "@/composables/useGameVersion.js";

  const emit = defineEmits(["change"]);

  const { versions, currentVersionId, setVersion } = useGameVersion();

  const handleSelect = (id) => {
    if (setVersion(id)) {
      emit("change", id);
    }
  };
</script>

<style scoped>
  .version-switch {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .version-label {
    font-size: 12px;
    color: #888;
    letter-spacing: 1px;
  }

  .version-options {
    display: flex;
    gap: 6px;
    padding: 4px;
    background: #1c1c1c;
    border: 1px solid #333;
    border-radius: 8px;
  }

  .version-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #aaa;
    font-size: 13px;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;
    white-space: nowrap;
  }

  .version-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #eee;
  }

  .version-btn.active {
    background: #ffcf00;
    border-color: #ffcf00;
    color: #121212;
    font-weight: bold;
  }

  .version-badge {
    font-size: 9px;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 3px;
    background: #ff4d4f;
    color: #fff;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .version-btn.active .version-badge {
    background: #121212;
    color: #ffcf00;
  }

  @media (max-width: 640px) {
    .version-switch {
      width: 100%;
    }

    .version-options {
      flex: 1;
    }

    .version-btn {
      flex: 1;
      justify-content: center;
      padding: 7px 8px;
      font-size: 12px;
    }
  }
</style>
