<template>
  <div class="arknights-tool">
    <main class="container">
      <div class="side-bar">
        <!-- 侧边栏选择功能 -->
        <div class="tab-list">
          <div
            class="tab-item"
            v-for="(tab, key) in TABS"
            :key="key"
            :class="{ active: currentTab === key }"
            @click="currentTab = tab.key"
          >
            {{ tab.label }}
          </div>
        </div>

        <PoolPanel
          v-if="currentTab === TABS.POOL.key"
          @add-to-team="addToTeam"
        />

        <SavedTeamsPanel
          v-if="currentTab === TABS.TEAM.key"
          :saved-teams="savedTeams"
          :team-collections="teamCollections"
          @load-team="loadTeam"
          @share-team="shareTeam"
          @share-collection="shareCollection"
          @edit-team="editTeamWrapper"
          @move-to-collection="moveToCollection"
          @delete-team="deleteTeam"
          @show-import-modal="showImportModal = true"
        />
      </div>

      <TeamPanel
        :team="team"
        :team-limit="teamLimit"
        :present-cov-list="presentCovList"
        :present-cov-counts="presentCovCounts"
        :active-cov-list="activeCovList"
        @update:team="team = $event"
        @update:team-limit="updateTeamLimit"
        @open-save-team-modal="openSaveTeamModalWrapper"
        @clear-team="team = []"
        @remove-from-team="removeFromTeam"
      />
    </main>

    <SaveTeamModal
      :show="showTeamModal"
      :currentTeam="team"
      :team-collections="teamCollections"
      :is-edit="!!editingTeam"
      :edit-team-data="
        editingTeam
          ? {
              ...editingTeam,
              teamIndex: editingLocation?.teamIndex,
              collectionIndex: editingLocation?.collectionIndex,
            }
          : null
      "
      @close="closeTeamModal"
      @save="saveTeamWrapper"
      @update="updateTeamWrapper"
    />

    <ShareModal
      :show="showShareModal"
      :title="shareType === 'team' ? '分享编队' : '分享合集'"
      :share-code="shareCode"
      :share-type="shareType"
      :preview-data="
        shareType === 'team' ? currentShareTeam : currentShareCollection
      "
      @close="closeShareModal"
    />

    <ImportModal
      :show="showImportModal"
      @close="closeImportModal"
      @import="importFromCode"
    />

    <!-- 临时提示消息 -->
    <div
      v-if="tempMessage"
      class="temp-message"
    >
      {{ tempMessage }}
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";

  import PoolPanel from "./components/PoolPanel.vue";
  import TeamPanel from "./components/TeamPanel.vue";
  import SavedTeamsPanel from "./components/SavedTeamsPanel.vue";
  import SaveTeamModal from "./components/SaveTeamModal.vue";
  import ShareModal from "./components/ShareModal.vue";
  import ImportModal from "./components/ImportModal.vue";

  import { useTeamStorage } from "@/composables/useTeamStorage.js";
  import { useShareCode } from "@/composables/useShareCode.js";
  import { useTeamManagement } from "@/composables/useTeamManagement.js";
  import { useModalState } from "@/composables/useModalState.js";
  import { useTeamOperations } from "@/composables/useTeamOperations.js";

  // 标签页常量
  const TABS = {
    POOL: { key: "pool", label: "干员池" },
    TEAM: { key: "team", label: "我的编队" },
  };
  const currentTab = ref(TABS.POOL.key);

  // 团队限制
  const teamLimit = ref(8);

  // 团队管理
  const {
    team,
    presentCovList,
    presentCovCounts,
    activeCovList,
    addToTeam,
    removeFromTeam,
    handleLimitChange,
    clearTeam,
    loadTeam: loadTeamFromManagement,
  } = useTeamManagement(teamLimit);

  // 存储和分享
  const {
    savedTeams,
    teamCollections,
    initSavedTeams,
    saveCollections,
    saveAllData,
    addOrUpdateTeam,
    deleteTeam: deleteStoredTeam,
    moveToCollection: moveStoredTeam,
  } = useTeamStorage();

  const {
    generateTeamCode,
    generateCollectionCode,
    importTeam: createTeamFromData,
    importCollection: createCollectionFromData,
  } = useShareCode();

  // 模态框状态
  const {
    showTeamModal,
    teamName,
    editingTeam,
    editingLocation,
    selectedCollection,
    showNewCollectionInput,
    newCollectionName,
    showShareModal,
    showImportModal,
    shareType,
    shareCode,
    importCode,
    currentShareTeam,
    currentShareCollection,
    tempMessage,
    openSaveTeamModal,
    closeTeamModal,
    closeShareModal,
    closeImportModal,
    showTempMessage,
  } = useModalState();

  // 团队操作
  const {
    saveTeam,
    updateTeam,
    editTeam,
    deleteTeam,
    moveToCollection,
    shareTeam,
    shareCollection,
    importFromCode,
  } = useTeamOperations(
    useTeamStorage,
    useShareCode,
    useModalState,
    teamCollections,
    savedTeams,
    saveCollections,
    saveAllData,
    addOrUpdateTeam,
    deleteStoredTeam,
    moveStoredTeam,
    generateTeamCode,
    generateCollectionCode,
    createTeamFromData,
    createCollectionFromData,
    showTempMessage,
    closeShareModal,
    closeImportModal,
    shareType,
    shareCode,
    currentShareTeam,
    currentShareCollection,
    showShareModal,
  );

  // 初始化
  onMounted(() => {
    document.title = "卫戍协议练功房";
    initSavedTeams();
  });


  // 包装loadTeam以切换标签
  const loadTeam = (savedItem) => {
    loadTeamFromManagement(savedItem);
    currentTab.value = TABS.TEAM.key;
  };

  // 包装openSaveTeamModal
  const openSaveTeamModalWrapper = () => {
    openSaveTeamModal(team.value);
  };

  // 包装editTeam
  const editTeamWrapper = (teamItem, collectionIndex, teamIndex) => {
    editTeam(
      teamItem,
      collectionIndex,
      teamIndex,
      editingTeam,
      editingLocation,
      showTeamModal,
    );
  };

  // 包装saveTeam和updateTeam
  const updateTeamLimit = (value) => {
    teamLimit.value = value;
    handleLimitChange();
  };

  const saveTeamWrapper = (teamData) => {
    saveTeam(teamData, team.value);
    closeTeamModal();
  };

  const updateTeamWrapper = (teamData) => {
    updateTeam(teamData, team.value);
    closeTeamModal();
  };
</script>

<style scoped>
  .arknights-tool {
    background: #121212;
    color: #eee;
    min-height: 95vh;
    padding: 20px;
    font-family: sans-serif;
  }

  .container {
    display: flex;
    gap: 30px;
    height: 92vh;
  }

  .tab-list {
    display: flex;
    justify-content: space-around;
    padding: 20px;
    font-family: sans-serif;
  }

  .tab-item {
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background 0.2s;
  }

  .tab-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .tab-item.active {
    background: #ffcf00;
    color: #121212;
  }

  .temp-message {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #ffcf00;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    z-index: 1001;
    animation: fadeOut 2s ease-in-out;
    pointer-events: none;
  }

  @keyframes fadeOut {
    0% {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    70% {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
  }

  @media (max-width: 1024px) {
    .container {
      flex-direction: column;
    }

    .side-bar {
      width: 90vw;
    }
  }
</style>
