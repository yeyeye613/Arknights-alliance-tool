<template>
  <div class="arknights-tool">
    <header class="app-header">
      <div class="app-title">
        <h1>卫戍协议练功房</h1>
        <p class="app-subtitle">
          {{ currentVersion.label }} · {{ currentVersion.desc }}
          <a
            class="source-link"
            :href="currentVersion.source"
            target="_blank"
            rel="noopener"
            >数据来源 PRTS</a
          >
        </p>
      </div>
      <VersionSwitch @change="handleVersionChange" />
    </header>

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
          :current-version-id="currentVersionId"
          @load-team="loadTeam"
          @share-team="shareTeamWrapper"
          @share-collection="shareCollectionWrapper"
          @edit-team="editTeamWrapper"
          @move-to-collection="moveToCollectionWrapper"
          @delete-team="deleteTeamWrapper"
          @show-import-modal="showImportModal = true"
        />
      </div>

      <TeamPanel
        :team="team"
        :team-limit="teamLimit"
        @update:team="team = $event"
        @update:team-limit="updateTeamLimit"
        @save-team="openSaveTeamModalWrapper"
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
      @import="importFromCodeWrapper"
    />

    <!-- 临时提示消息 -->
    <div
      v-if="tempMessage"
      class="temp-message"
    >
      {{ tempMessage }}
    </div>

    <!-- 全局唯一的特质悬停提示 -->
    <TraitTooltip />
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
  import VersionSwitch from "./components/VersionSwitch.vue";
  import TraitTooltip from "./components/TraitTooltip.vue";

  import { useTeamStorage } from "@/composables/useTeamStorage.js";
  import { useShareCode } from "@/composables/useShareCode.js";
  import { useTeamManagement } from "@/composables/useTeamManagement.js";
  import { useModalState } from "@/composables/useModalState.js";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import { DEFAULT_VERSION_ID, getGameVersion } from "@/data/versions.js";

  // 游戏版本
  const { currentVersion, currentVersionId, setVersion } = useGameVersion();

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
    // 新增操作方法
    saveTeam,
    updateTeam,
    deleteTeamOp,
    moveToCollectionOp,
  } = useTeamStorage();

  const {
    generateTeamCode,
    generateCollectionCode,
    importTeam: createTeamFromData,
    importCollection: createCollectionFromData,
    // 新增操作方法
    shareTeam,
    shareCollection,
    importFromCode,
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
    // 新增操作方法
    editTeam,
  } = useModalState();

  // 初始化
  onMounted(() => {
    document.title = `卫戍协议练功房 · ${currentVersion.value.shortLabel}`;
    initSavedTeams();
  });

  // 包装loadTeam以切换标签
  const loadTeam = (savedItem) => {
    // 加载其他版本的编队时自动切换版本，避免盟约统计错乱
    const teamVersion = savedItem?.version || DEFAULT_VERSION_ID;
    if (teamVersion !== currentVersionId.value && setVersion(teamVersion)) {
      showTempMessage(`已切换到「${getGameVersion(teamVersion).label}」`);
    }
    loadTeamFromManagement(savedItem);
    currentTab.value = TABS.TEAM.key;
  };

  // 版本切换提示
  const handleVersionChange = (id) => {
    showTempMessage(`已切换到「${getGameVersion(id).label}」`);
  };

  // 包装openSaveTeamModal
  const openSaveTeamModalWrapper = () => {
    openSaveTeamModal(team.value);
  };

  // 包装editTeam
  const editTeamWrapper = (teamItem, collectionIndex, teamIndex) => {
    editTeam(teamItem, collectionIndex, teamIndex);
  };

  // 包装saveTeam和updateTeam
  const updateTeamLimit = (value) => {
    teamLimit.value = value;
    handleLimitChange();
  };

  const saveTeamWrapper = (teamData) => {
    saveTeam(teamData, team.value, showTempMessage, currentVersionId.value);
    closeTeamModal();
  };

  const updateTeamWrapper = (teamData) => {
    updateTeam(teamData, team.value, showTempMessage, currentVersionId.value);
    closeTeamModal();
  };

  // 新增包装函数
  const deleteTeamWrapper = (collectionIndex, teamIndex) => {
    deleteTeamOp(collectionIndex, teamIndex, showTempMessage);
  };

  const moveToCollectionWrapper = (teamItem, index) => {
    moveToCollectionOp(teamItem, index, showTempMessage);
  };

  const shareTeamWrapper = (teamItem) => {
    shareTeam(
      teamItem,
      currentShareTeam,
      shareType,
      shareCode,
      showShareModal,
      showTempMessage,
      teamItem?.version || currentVersionId.value,
    );
  };

  const shareCollectionWrapper = (collection) => {
    shareCollection(
      collection,
      currentShareCollection,
      shareType,
      shareCode,
      showShareModal,
      showTempMessage,
      collection?.version || currentVersionId.value,
    );
  };

  const importFromCodeWrapper = (data) => {
    // 分享码带有版本信息时，先切到对应版本再导入
    const codeVersion = data?.g;
    if (codeVersion && codeVersion !== currentVersionId.value) {
      setVersion(codeVersion);
      showTempMessage(`已切换到「${getGameVersion(codeVersion).label}」`);
    }
    importFromCode(
      data,
      savedTeams,
      teamCollections,
      saveAllData,
      saveCollections,
      showTempMessage,
      closeImportModal,
      codeVersion || currentVersionId.value,
    );
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

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 0 4px 14px;
  }

  .app-title h1 {
    margin: 0;
    font-size: 20px;
    letter-spacing: 1px;
  }

  .app-subtitle {
    margin: 6px 0 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: #8a8a8a;
  }

  .source-link {
    color: #7fb3ff;
    text-decoration: none;
    border-bottom: 1px dashed rgba(127, 179, 255, 0.45);
  }

  .source-link:hover {
    color: #a9ccff;
  }

  .container {
    display: flex;
    gap: 30px;
    height: calc(92vh - 70px);
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
