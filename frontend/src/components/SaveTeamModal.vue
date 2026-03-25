<template>
  <div
    v-if="show"
    class="modal-overlay"
    @click="closeModal"
  >
    <div
      class="modal-content"
      @click.stop
    >
      <div class="modal-header">
        <h3>{{ isEdit ? "编辑编队" : "保存编队" }}</h3>
        <button
          @click="closeModal"
          class="close-btn"
        >
          &times;
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="teamName">编队名称</label>
          <input
            id="teamName"
            v-model="teamName"
            type="text"
            placeholder="输入编队名称"
            @keyup.enter="saveTeam"
            ref="nameInput"
          />
        </div>

        <div
          class="form-group"
          v-if="!isEdit"
        >
          <label>保存到合集</label>
          <div class="collection-options">
            <div class="collection-option">
              <input
                type="radio"
                id="no-collection"
                value=""
                v-model="selectedCollection"
              />
              <label for="no-collection">不归类</label>
            </div>
            <div
              v-for="(collection, index) in teamCollections"
              :key="index"
              class="collection-option"
            >
              <input
                type="radio"
                :id="'collection-' + index"
                :value="index"
                v-model="selectedCollection"
              />
              <label :for="'collection-' + index">{{ collection.name }}</label>
            </div>
          </div>
        </div>

        <div class="team-preview">
          <h4>编队预览</h4>
          <div class="team-avatars">
            <img
              v-for="op in currentTeam"
              :key="op.id"
              :src="op.avatar"
              class="preview-avatar"
            />
          </div>
          <div class="team-stats">
            <span>干员数量: {{ currentTeam.length }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          @click="closeModal"
          class="btn cancel-btn"
        >
          取消
        </button>
        <button
          @click="saveTeam"
          class="btn save-btn"
          :disabled="!teamName.trim()"
        >
          {{ isEdit ? "更新" : "保存" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, nextTick, watch } from "vue";

  const props = defineProps({
    show: Boolean,
    currentTeam: Array,
    teamCollections: Array,
    isEdit: Boolean,
    editTeamData: Object,
  });

  const emit = defineEmits(["close", "save", "update"]);

  const teamName = ref("");
  const selectedCollection = ref("");
  const nameInput = ref(null);

  watch(
    () => props.show,
    async (newVal) => {
      if (newVal) {
        if (props.isEdit && props.editTeamData) {
          teamName.value = props.editTeamData.name;
          selectedCollection.value = props.editTeamData.collectionIndex || "";
        } else {
          teamName.value = "";
          selectedCollection.value = "";
        }
        await nextTick();
        nameInput.value?.focus();
      }
    },
  );

  const closeModal = () => {
    emit("close");
  };

  const saveTeam = () => {
    if (!teamName.value.trim()) return;

    const teamData = {
      name: teamName.value.trim(),
      team: [...props.currentTeam],
      collectionIndex: selectedCollection.value || null,
    };

    if (props.isEdit) {
      emit("update", {
        ...teamData,
        originalIndex: props.editTeamData.teamIndex,
        originalCollectionIndex: props.editTeamData.collectionIndex,
      });
    } else {
      emit("save", teamData);
    }

    closeModal();
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

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #ccc;
  }

  .form-group input[type="text"] {
    width: 100%;
    padding: 10px;
    background: #252525;
    border: 1px solid #444;
    border-radius: 4px;
    color: white;
    font-size: 14px;
  }

  .form-group input[type="text"]:focus {
    outline: none;
    border-color: #4caf50;
  }

  .collection-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .collection-option {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .collection-option input[type="radio"] {
    margin: 0;
  }

  .collection-option label {
    cursor: pointer;
    font-size: 14px;
  }

  .team-preview {
    margin-top: 20px;
    padding: 15px;
    background: #252525;
    border-radius: 6px;
  }

  .team-preview h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
  }

  .team-avatars {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .preview-avatar {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    background: #333;
    object-fit: cover;
  }

  .team-stats {
    font-size: 12px;
    color: #888;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
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

  .cancel-btn {
    background: #333;
    color: white;
  }

  .cancel-btn:hover {
    background: #444;
  }

  .save-btn {
    background: #4caf50;
    color: white;
  }

  .save-btn:hover:not(:disabled) {
    background: #45a049;
  }

  .save-btn:disabled {
    background: #666;
    cursor: not-allowed;
  }
</style>
