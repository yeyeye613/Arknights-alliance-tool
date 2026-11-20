<template>
  <div class="panel-header">
    <h3>当前编队 ({{ count }}/{{ limit }})</h3>
    <div class="header-actions">
      <div class="limit-setter">
        <label>上限:</label>
        <input
          type="number"
          :value="limit"
          min="1"
          max="20"
          class="limit-input"
          @input="handleInput"
          @change="emit('limit-change')"
        />
      </div>
      <button
        type="button"
        class="new-team-btn"
        @click="emit('save')"
      >
        保存编队
      </button>
      <button
        type="button"
        class="clear-btn"
        @click="emit('clear')"
      >
        清空
      </button>
    </div>
  </div>
</template>

<script setup>
  /**
   * 编队标题栏：人数、上限输入、保存、清空。
   *
   * 上限的「截断已有编队」不在这里做（那需要读写 team），
   * 只把输入限制在 1–20 并抛出 `limit-change`。
   */
  defineProps({
    /** 当前编队人数 */
    count: { type: Number, default: 0 },
    /** 当前上限 */
    limit: { type: Number, default: 8 },
  });
  const emit = defineEmits(["update:limit", "limit-change", "save", "clear"]);

  const handleInput = (event) => {
    const next = Number(event.target.value);
    const safe = Number.isFinite(next) ? next : 1;
    emit("update:limit", Math.max(1, Math.min(20, safe)));
  };
</script>

<style scoped>
  .panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 2px 2px 0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .limit-setter {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #333;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
  }

  .limit-input {
    width: 35px;
    background: transparent;
    border: none;
    color: #ffcf00;
    font-weight: bold;
    text-align: center;
    outline: none;
  }

  .new-team-btn {
    background: #ffcf00;
    color: #121212;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: 0.3s;
  }

  .new-team-btn:hover {
    background: #ffdd44;
  }

  .clear-btn {
    background: transparent;
    border: 1px solid #555;
    color: #888;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: 0.3s;
  }

  .clear-btn:hover {
    background: #ff4d4f;
    color: white;
    border-color: #ff4d4f;
  }

  @media (max-width: 768px) {
    .panel-header {
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 4px 0 10px;
    }

    .panel-header h3 {
      font-size: 15px;
    }

    .limit-setter {
      order: 3;
      margin-left: auto;
      font-size: 12px;
    }

    .new-team-btn,
    .clear-btn {
      padding: 8px 12px;
      font-size: 13px;
    }

    .clear-btn {
      padding: 8px 10px;
    }
  }
</style>
