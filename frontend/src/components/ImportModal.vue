<template>
  <BaseModal
    :show="show"
    title="导入编队"
    content-class="share-modal"
    @close="closeModal"
  >
    <div>
      <div class="form-group">
        <label for="importCode">输入分享码</label>
        <textarea
          id="importCode"
          v-model="importCode"
          placeholder="粘贴分享码..."
          rows="4"
          @input="validateCode"
          ref="codeTextarea"
        ></textarea>
      </div>

      <div
        v-if="previewData"
        class="import-preview"
      >
        <h4>预览</h4>
        <div class="preview-content">
          <div v-if="previewData.type === 'team'">
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

          <div v-if="previewData.type === 'collection'">
            <div class="preview-collection-name">{{ previewData.name }}</div>
            <div class="preview-collection-teams">
              <div
                v-for="team in previewData.teams"
                :key="team.name"
                class="preview-collection-team"
              >
                <span class="team-name">{{ team.name }}</span>
                <div class="team-avatars">
                  <img
                    v-for="op in (team.team || []).slice(0, 5)"
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

      <div
        v-if="errorMessage"
        class="error-message"
      >
        {{ errorMessage }}
      </div>
    </div>

    <template #footer>
      <button
        @click="closeModal"
        class="btn cancel-btn"
      >
        取消
      </button>
      <button
        @click="importData"
        class="btn import-btn"
        :disabled="!parsedData || !!errorMessage"
      >
        导入
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
  import { ref, watch, nextTick, computed } from "vue";
  import BaseModal from "./BaseModal.vue";
  import { useShareCode } from "../composables/useShareCode.js";

  const { parseCode, restoreOperators } = useShareCode();

  const props = defineProps({
    show: Boolean,
  });

  const emit = defineEmits(["close", "import"]);

  const importCode = ref("");
  const parsedData = ref(null);
  const errorMessage = ref("");
  const codeTextarea = ref(null);

  const previewData = computed(() => {
    if (!parsedData.value) return null;

    if (parsedData.value.type === "team") {
      return {
        type: "team",
        name: parsedData.value.n,
        team: restoreOperators(parsedData.value.ops || []),
      };
    }

    if (parsedData.value.type === "collection") {
      return {
        type: "collection",
        name: parsedData.value.n,
        teams: (parsedData.value.teams || []).map((team) => ({
          name: team.n,
          team: restoreOperators(team.ops || []),
        })),
      };
    }

    return null;
  });

  watch(
    () => props.show,
    async (newVal) => {
      if (newVal) {
        importCode.value = "";
        parsedData.value = null;
        errorMessage.value = "";
        await nextTick();
        codeTextarea.value?.focus();
      }
    },
  );

  const closeModal = () => {
    emit("close");
  };

  const validateCode = () => {
    if (!importCode.value.trim()) {
      parsedData.value = null;
      errorMessage.value = "";
      return;
    }

    try {
      const result = parseCode(importCode.value.trim());
      parsedData.value = result;
      errorMessage.value = "";
    } catch (error) {
      parsedData.value = null;
      errorMessage.value = error.message || "分享码格式错误";
    }
  };

  const importData = () => {
    if (!parsedData.value) return;

    emit("import", parsedData.value);
    closeModal();
  };
</script>

<style scoped>
  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #ccc;
  }

  .form-group textarea {
    width: 100%;
    padding: 10px;
    background: #252525;
    border: 1px solid #444;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    font-family: monospace;
    resize: vertical;
    min-height: 80px;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #4caf50;
  }

  .import-preview {
    padding: 15px;
    background: #252525;
    border-radius: 6px;
    margin-bottom: 15px;
  }

  .import-preview h4 {
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

  .error-message {
    color: #f44336;
    font-size: 14px;
    padding: 10px;
    background: rgba(244, 67, 54, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(244, 67, 54, 0.3);
  }

  .import-btn {
    background: #4caf50;
    color: white;
  }

  .import-btn:hover:not(:disabled) {
    background: #45a049;
  }

  .import-btn:disabled {
    background: #666;
    cursor: not-allowed;
  }
</style>
