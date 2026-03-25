<template>
  <div
    v-if="show"
    class="modal-overlay"
    @click="closeModal"
  >
    <div
      class="modal-content share-modal"
      @click.stop
    >
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button
          @click="closeModal"
          class="close-btn"
        >
          &times;
        </button>
      </div>

      <div class="modal-body">
        <div class="share-content">
          <div class="share-code-section">
            <label for="shareCode">分享码</label>
            <div class="code-input-group">
              <input
                id="shareCode"
                :value="shareCode"
                type="text"
                readonly
                ref="codeInput"
                @click="selectAll"
              />
              <button
                @click="copyCode"
                class="copy-btn"
                :class="{ copied: copied }"
              >
                {{ copied ? "已复制" : "复制" }}
              </button>
            </div>
          </div>

          <div
            class="share-preview"
            v-if="previewData"
          >
            <h4>预览</h4>
            <div class="preview-content">
              <div
                v-if="props.shareType === 'team' || previewData.type === 'team'"
              >
                <div class="preview-team-name">{{ previewData.name }}</div>
                <div class="preview-team-avatars">
                  <img
                    v-for="op in previewData.team"
                    :key="op.id"
                    :src="op.avatar"
                    class="preview-avatar"
                  />
                </div>
                <div class="preview-team-stats">
                  干员数量: {{ previewData.team.length }}
                </div>
              </div>

              <div
                v-else-if="
                  props.shareType === 'collection' ||
                  previewData.type === 'collection'
                "
              >
                <div class="preview-collection-name">
                  {{ previewData.name }}
                </div>
                <div class="preview-collection-teams">
                  <div
                    v-for="team in previewData.teams"
                    :key="team.name"
                    class="preview-collection-team"
                  >
                    <span class="team-name">{{ team.name }}</span>
                    <div class="team-avatars">
                      <img
                        v-for="op in team.team.slice(0, 5)"
                        :key="op.id"
                        :src="op.avatar"
                        class="preview-avatar small"
                      />
                    </div>
                  </div>
                </div>
                <div class="preview-collection-stats">
                  编队数量: {{ previewData.teams.length }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          @click="closeModal"
          class="btn close-btn"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, nextTick, watch } from "vue";

  const props = defineProps({
    show: Boolean,
    title: String,
    shareCode: String,
    shareType: String,
    previewData: Object,
  });

  const emit = defineEmits(["close"]);

  const copied = ref(false);
  const codeInput = ref(null);

  watch(
    () => props.show,
    async (newVal) => {
      if (newVal) {
        copied.value = false;
        await nextTick();
        codeInput.value?.select();
      }
    },
  );

  const closeModal = () => {
    emit("close");
  };

  const selectAll = () => {
    codeInput.value?.select();
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(props.shareCode);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      codeInput.value?.select();
      document.execCommand("copy");
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
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
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    padding: 20px;
  }

  .share-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .share-code-section label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #ccc;
  }

  .code-input-group {
    display: flex;
    gap: 10px;
  }

  .code-input-group input {
    flex: 1;
    padding: 10px;
    background: #252525;
    border: 1px solid #444;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    font-family: monospace;
  }

  .code-input-group input:focus {
    outline: none;
    border-color: #4caf50;
  }

  .copy-btn {
    padding: 10px 15px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: 0.2s;
    min-width: 80px;
  }

  .copy-btn:hover {
    background: #45a049;
  }

  .copy-btn.copied {
    background: #ff9800;
  }

  .share-preview {
    padding: 15px;
    background: #252525;
    border-radius: 6px;
  }

  .share-preview h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
  }

  .preview-content {
    color: #ccc;
  }

  .preview-team-name,
  .preview-collection-name {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 12px;
    color: white;
  }

  .preview-team-avatars,
  .team-avatars {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .preview-avatar {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    background: #333;
    object-fit: cover;
  }

  .preview-avatar.small {
    width: 30px;
    height: 30px;
  }

  .preview-team-stats,
  .preview-collection-stats {
    font-size: 12px;
    color: #888;
  }

  .preview-collection-teams {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .preview-collection-team {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    background: #1e1e1e;
    border-radius: 4px;
  }

  .team-name {
    font-size: 14px;
    font-weight: 500;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 20px;
    border-top: 1px solid #333;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: 0.2s;
  }

  .close-btn {
    background: #333;
    color: white;
  }

  .close-btn:hover {
    background: #444;
  }

  .share-modal .share-code-container,
  .share-modal .share-preview {
    width: 100%;
  }

  .share-modal .share-code {
    min-height: 70px;
  }
</style>
