<template>
  <section class="panel-content">
    <div class="saved-teams-header">
      <h3>已保存编队</h3>
      <div class="header-actions">
        <button
          @click="editMode = !editMode"
          class="action-btn delete-btn"
          title="编辑模式"
        >
          {{ editMode ? "完成编辑" : "编辑模式" }}
        </button>
        <button
          @click.stop="showImportModal"
          class="action-btn share-small-btn"
          title="导入"
        >
          导入
        </button>
      </div>
    </div>

    <div class="saved-teams-list">
      <div
        v-for="(collection, collectionIndex) in teamCollections"
        :key="collectionIndex"
        class="team-collection"
      >
        <div
          class="collection-header"
          @click="toggleCollection(collectionIndex)"
        >
          <span class="collection-name"
            >📁 {{ collection.name }} ({{ collection.teams.length }})</span
          >
          <div class="collection-actions">
            <button
              @click.stop="shareCollection(collection)"
              v-if="!editMode"
              class="action-btn share-small-btn"
              title="分享合集"
            >
              分享
            </button>
            <span
              class="collection-arrow"
              :class="{ expanded: collection.expanded }"
              >▼</span
            >
          </div>
        </div>

        <div
          v-show="collection.expanded"
          class="collection-teams"
        >
          <div
            v-for="(teamItem, teamIndex) in collection.teams"
            :key="teamIndex"
            class="saved-team-item"
          >
            <div class="team-preview">
              <span class="team-name">{{ teamItem.name }}</span>
              <div class="team-avatars">
                <img
                  v-for="op in teamItem.team.slice(0, 9)"
                  :key="op.id"
                  :src="op.avatar"
                  class="preview-avatar"
                />
              </div>
            </div>
            <div class="team-actions">
              <button
                @click="loadTeam(teamItem)"
                class="action-btn load-btn"
                v-if="!editMode"
                title="加载编队"
              >
                加载
              </button>
              <button
                @click="shareTeam(teamItem)"
                class="action-btn share-small-btn"
                v-if="!editMode"
                title="分享编队"
              >
                分享
              </button>
              <button
                @click="editTeam(teamItem, collectionIndex, teamIndex)"
                class="action-btn edit-btn"
                v-if="editMode"
                title="编辑"
              >
                编辑
              </button>
              <button
                @click="moveToCollection(teamItem, index)"
                class="action-btn move-btn"
                v-if="editMode"
                title="移动到合集"
              >
                移动
              </button>
              <button
                @click="deleteTeam(collectionIndex, teamIndex)"
                class="action-btn delete-btn"
                v-if="editMode"
                title="删除"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 未归类的独立编队 -->
      <div
        v-if="savedTeams.length > 0"
        class="team-collection"
      >
        <div
          class="collection-header"
          @click="toggleUngrouped"
        >
          <span class="collection-name"
            >📂 未归类编队 ({{ savedTeams.length }})</span
          >
          <span
            class="collection-arrow"
            :class="{ expanded: ungroupedExpanded }"
            >▼</span
          >
        </div>

        <div
          v-show="ungroupedExpanded"
          class="collection-teams"
        >
          <div
            v-for="(teamItem, index) in savedTeams"
            :key="index"
            class="saved-team-item"
          >
            <div class="team-preview">
              <span class="team-name">{{ teamItem.name }}</span>
              <div class="team-avatars">
                <img
                  v-for="op in teamItem.team.slice(0, 9)"
                  :key="op.id"
                  :src="op.avatar"
                  class="preview-avatar"
                />
              </div>
            </div>
            <div class="team-actions">
              <button
                @click="loadTeam(teamItem)"
                class="action-btn load-btn"
                v-if="!editMode"
                title="加载编队"
              >
                加载
              </button>
              <button
                @click="shareTeam(teamItem)"
                class="action-btn share-small-btn"
                v-if="!editMode"
                title="分享编队"
              >
                分享
              </button>
              <button
                @click="editTeam(teamItem, null, index)"
                class="action-btn edit-btn"
                v-if="editMode"
                title="编辑"
              >
                编辑
              </button>
              <button
                @click="moveToCollection(teamItem, index)"
                class="action-btn move-btn"
                v-if="editMode"
                title="移动到合集"
              >
                移动
              </button>
              <button
                @click="deleteTeam(null, index)"
                class="action-btn delete-btn"
                v-if="editMode"
                title="删除"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="savedTeams.length === 0 && teamCollections.length === 0"
        class="empty-teams"
      >
        <p>暂无保存的编队</p>
      </div>
    </div>
  </section>
</template>

<script setup>
  import { ref } from "vue";

  const props = defineProps({
    savedTeams: Array,
    teamCollections: Array,
  });

  const emit = defineEmits([
    "loadTeam",
    "shareTeam",
    "shareCollection",
    "editTeam",
    "moveToCollection",
    "deleteTeam",
    "showImportModal",
  ]);

  const editMode = ref(false);
  const ungroupedExpanded = ref(true);

  const loadTeam = (teamItem) => {
    emit("loadTeam", teamItem);
  };

  const shareTeam = (teamItem) => {
    emit("shareTeam", teamItem);
  };

  const shareCollection = (collection) => {
    emit("shareCollection", collection);
  };

  const editTeam = (teamItem, collectionIndex, teamIndex) => {
    emit("editTeam", teamItem, collectionIndex, teamIndex);
  };

  const moveToCollection = (teamItem, index) => {
    emit("moveToCollection", teamItem, index);
  };

  const deleteTeam = (collectionIndex, teamIndex) => {
    emit("deleteTeam", collectionIndex, teamIndex);
  };

  const showImportModal = () => {
    emit("showImportModal");
  };

  const toggleCollection = (index) => {
    props.teamCollections[index].expanded =
      !props.teamCollections[index].expanded;
  };

  const toggleUngrouped = () => {
    ungroupedExpanded.value = !ungroupedExpanded.value;
  };
</script>

<style scoped>
  .panel-content {
    width: 30vw;
  }

  .saved-teams-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #252525;
    border-radius: 8px;
    margin-bottom: 15px;
  }

  .saved-teams-header h3 {
    margin: 0;
    font-size: 16px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    transition: 0.2s;
  }

  .share-small-btn {
    background: transparent;
    font-size: 14px;
    padding: 2px 6px;
  }

  .share-small-btn:hover {
    background: #4caf50;
    color: white;
  }

  .saved-teams-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: calc(80vh - 60px);
    overflow-y: auto;
  }

  .team-collection {
    background: #1e1e1e;
    border-radius: 6px;
  }

  .collection-header {
    padding: 12px 15px;
    background: #2a2a2a;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background 0.2s;
  }

  .collection-header:hover {
    background: #333;
  }

  .collection-name {
    font-weight: bold;
    font-size: 14px;
  }

  .collection-arrow {
    transition: transform 0.2s;
    font-size: 12px;
  }

  .collection-arrow.expanded {
    transform: rotate(180deg);
  }

  .collection-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .collection-teams {
    padding: 10px;
  }

  .saved-team-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #252525;
    border-radius: 4px;
    margin-bottom: 8px;
    transition: 0.2s;
  }

  .saved-team-item:hover {
    background: #2f2f2f;
  }

  .team-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .team-avatars {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
  }

  .preview-avatar {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    background: #333;
    object-fit: cover;
  }

  .team-name {
    font-size: 13px;
    font-weight: 500;
  }

  .team-actions {
    display: flex;
    gap: 6px;
  }

  .load-btn:hover {
    background: #4caf50;
    color: white;
  }

  .edit-btn:hover {
    background: #ff9800;
    color: white;
  }

  .move-btn:hover {
    background: #2196f3;
    color: white;
  }

  .delete-btn:hover {
    background: #f44336;
    color: white;
  }

  .empty-teams {
    text-align: center;
    padding: 40px;
    color: #888;
  }


  @media (max-width: 1024px) {
    .panel-content {
      width: 90vw;
    }
  }
</style>
