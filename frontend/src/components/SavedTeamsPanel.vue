<template>
  <section class="panel-content">
    <div class="saved-teams-header">
      <h3>已保存编队</h3>
      <div class="header-actions">
        <button
          type="button"
          @click="editMode = !editMode"
          class="action-btn delete-btn"
          title="编辑模式"
        >
          {{ editMode ? "完成编辑" : "编辑模式" }}
        </button>
        <button
          type="button"
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
        v-for="view in collectionViews"
        :key="view.collectionIndex"
        class="team-collection"
      >
        <div
          class="collection-header"
          @click="toggleCollection(view.collection.name)"
        >
          <span class="collection-name"
            >📁 {{ view.collection.name }} ({{ view.teams.length }})</span
          >
          <div class="collection-actions">
            <button
              v-if="!editMode"
              type="button"
              @click.stop="shareCollection(view.collection)"
              class="action-btn share-small-btn"
              title="分享合集"
            >
              分享
            </button>
            <span
              class="collection-arrow"
              :class="{ expanded: view.collection.expanded }"
              >▼</span
            >
          </div>
        </div>

        <div
          v-show="view.collection.expanded"
          class="collection-teams"
        >
          <TeamCard
            v-for="entry in view.teams"
            :key="entry.teamIndex"
            :team="entry.team"
            :edit-mode="editMode"
            @load="loadTeam(entry.team)"
            @share="shareTeam(entry.team)"
            @edit="editTeam(entry.team, view.collection.name, entry.teamIndex)"
            @move="moveToCollection(entry.team, view.collection.name, null)"
            @remove="deleteTeam(view.collection.name, entry.teamIndex)"
          />
        </div>
      </div>

      <!-- 未归类的独立编队 -->
      <div
        v-if="savedTeamsView.length > 0"
        class="team-collection"
      >
        <div
          class="collection-header"
          @click="toggleUngrouped"
        >
          <span class="collection-name"
            >📂 未归类编队 ({{ savedTeamsView.length }})</span
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
          <TeamCard
            v-for="entry in savedTeamsView"
            :key="entry.index"
            :team="entry.team"
            :edit-mode="editMode"
            @load="loadTeam(entry.team)"
            @share="shareTeam(entry.team)"
            @edit="editTeam(entry.team, null, entry.index)"
            @move="moveToCollection(entry.team, null, entry.index)"
            @remove="deleteTeam(null, entry.index)"
          />
        </div>
      </div>

      <div
        v-if="savedTeamsView.length === 0 && collectionViews.length === 0"
        class="empty-teams"
      >
        <p>当前版本暂无保存的编队</p>
      </div>
    </div>
  </section>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { DEFAULT_VERSION_ID } from "@/data/versions.js";
  import { resolveTeamVersionId } from "@/domain/teamRules";
  import TeamCard from "./TeamCard.vue";

  const props = defineProps({
    savedTeams: Array,
    teamCollections: Array,
    currentVersionId: {
      type: String,
      default: DEFAULT_VERSION_ID,
    },
  });

  const emit = defineEmits([
    "loadTeam",
    "shareTeam",
    "shareCollection",
    "editTeam",
    "moveToCollection",
    "deleteTeam",
    "toggleCollection",
    "showImportModal",
  ]);

  const editMode = ref(false);
  const ungroupedExpanded = ref(true);

  /** 编队所属版本（历史存档未标记版本时归入默认版本） */
  const getTeamVersion = (teamItem) => resolveTeamVersionId(teamItem);

  /** 当前版本下的未归类编队（保留原始索引以便增删改） */
  const savedTeamsView = computed(() =>
    (props.savedTeams || [])
      .map((team, index) => ({ team, index }))
      .filter((entry) => getTeamVersion(entry.team) === props.currentVersionId),
  );

  /** 当前版本下的合集视图（合集内仅展示当前版本的编队） */
  const collectionViews = computed(() =>
    (props.teamCollections || [])
      .map((collection, collectionIndex) => ({
        collection,
        collectionIndex,
        teams: (collection.teams || [])
          .map((team, teamIndex) => ({ team, teamIndex }))
          .filter(
            (entry) => getTeamVersion(entry.team) === props.currentVersionId,
          ),
      }))
      .filter((view) => view.teams.length > 0),
  );

  const loadTeam = (teamItem) => {
    emit("loadTeam", teamItem);
  };

  const shareTeam = (teamItem) => {
    emit("shareTeam", teamItem);
  };

  const shareCollection = (collection) => {
    emit("shareCollection", collection);
  };

  /** 合集用名字标识（索引会随合集增删漂移），未分类传 null */
  const editTeam = (teamItem, collectionName, teamIndex) => {
    emit("editTeam", teamItem, collectionName, teamIndex);
  };

  /**
   * 询问目标合集名后交给父级落库
   *
   * 询问属于视图层（composable 不再弹窗）；源位置用「合集名 + 未分类索引」
   * 表达，合集内条目没有未分类索引，因此传 null。
   */
  const moveToCollection = (teamItem, fromCollectionName, savedIndex) => {
    const targetCollectionName = prompt("请输入合集名称：", "");
    if (!targetCollectionName) return;
    emit("moveToCollection", {
      teamItem,
      fromCollectionName,
      savedIndex,
      targetCollectionName,
    });
  };

  const deleteTeam = (collectionName, teamIndex) => {
    emit("deleteTeam", collectionName, teamIndex);
  };

  const showImportModal = () => {
    emit("showImportModal");
  };

  /** 展开 / 收起交给父级维护：props 里的合集对象不属于本组件 */
  const toggleCollection = (collectionName) => {
    emit("toggleCollection", collectionName);
  };

  const toggleUngrouped = () => {
    ungroupedExpanded.value = !ungroupedExpanded.value;
  };
</script>

<style scoped>
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

  /* .action-btn 在 TeamCard 里另有一份：scoped 样式无法跨文件复用 */
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

  .delete-btn:hover {
    background: #f44336;
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

  .empty-teams {
    text-align: center;
    padding: 40px;
    color: #888;
  }

  @media (max-width: 1024px) {
    .panel-content {
      width: 100%;
    }

    .saved-teams-list {
      max-height: none;
    }
  }

  @media (max-width: 768px) {
    .saved-teams-header {
      padding: 10px 12px;
      margin-bottom: 10px;
    }

    .saved-teams-header h3 {
      font-size: 15px;
    }

    .saved-teams-list {
      gap: 8px;
    }

    .collection-header {
      padding: 10px 12px;
    }

    .collection-teams {
      padding: 8px;
    }

    .empty-teams {
      padding: 24px 12px;
    }
  }
</style>
