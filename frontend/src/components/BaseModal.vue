<template>
  <div
    v-if="show"
    class="modal-overlay"
    @click="handleOverlayClick"
  >
    <div
      class="modal-content"
      :class="contentClass"
      @click.stop
    >
      <!-- 头部区域 -->
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button
          @click="closeModal"
          class="close-btn"
        >
          &times;
        </button>
      </div>

      <!-- 内容区域（通过 slot 自定义） -->
      <div class="modal-body">
        <slot></slot>
      </div>

      <!-- 页脚区域（通过 slot 自定义） -->
      <div
        v-if="$slots.footer"
        class="modal-footer"
      >
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    show: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    contentClass: {
      type: String,
      default: "",
    },
    closeOnOverlay: {
      type: Boolean,
      default: true,
    },
  });

  const emit = defineEmits(["close"]);

  const closeModal = () => {
    emit("close");
  };

  const handleOverlayClick = () => {
    if (props.closeOnOverlay) {
      closeModal();
    }
  };
</script>

<style scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: #1e1e1e;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ffcf00;
    padding: 20px;
    border-bottom: 1px solid #333;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #888;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: 0.2s;
  }

  .close-btn:hover {
    background: #333;
    color: white;
  }

  .modal-body {
    border-radius: 6px;
    padding: 20px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid #333;
  }

  :deep(.btn) {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: 0.2s;
  }

  :deep(.cancel-btn) {
    background: #333;
    color: white;
  }

  :deep(.cancel-btn:hover) {
    background: #444;
  }

  :deep(input),
  :deep(textarea),
  :deep(select) {
    box-sizing: border-box;
  }
</style>
