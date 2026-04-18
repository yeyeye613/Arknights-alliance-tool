<template>
  <BaseModal
    :show="show"
    :title="isEdit ? '编辑编队' : '保存编队'"
    @close="closeModal"
  >
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

    <template #footer>
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
    </template>
  </BaseModal>
</template>

<script setup>
  import { ref, nextTick, watch } from "vue";
  import BaseModal from "./BaseModal.vue";

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
