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
            v-for="tab in visibleTabs"
            :key="tab.key"
            :class="{ active: currentTab === tab.key }"
            @click="currentTab = tab.key"
          >
            {{ tab.label }}
          </div>
        </div>

        <PoolPanel
          v-if="isPoolTab"
          @add-to-team="addToTeam"
        />

        <!-- 装备池：独立标签页，点击「装备池」切到这里 -->
        <EquipmentPool
          v-if="isEquipTab"
          class="equip-page"
          :staged="stagedEquipments"
          @stage="stageEquipment"
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

      <div class="team-col">
        <TeamPanel
          :team="team"
          :team-limit="teamLimit"
          :drop-hint="hasEquipmentPool && stagedEquipments.length > 0"
          :selected-equipment="selectedEquipment"
          @update:team="team = $event"
          @update:team-limit="updateTeamLimit"
          @save-team="openSaveTeamModalWrapper"
          @clear-team="team = []"
          @remove-from-team="removeFromTeam"
          @notify="showTempMessage"
          @equipment-equipped="handleEquipmentEquipped"
        >
          <!-- 临时装备池：贴在编队干员正下方，没有装备时不出现 -->
          <template #staging>
            <EquipmentStaging
              v-if="hasEquipmentPool && stagedEquipments.length > 0"
              :items="stagedEquipments"
              :selected="selectedEquipment"
              @select="selectEquipment"
              @remove="unstageEquipment"
              @clear="clearStagedEquipments"
            />
          </template>
        </TeamPanel>
      </div>
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
    <!-- 全局唯一的盟约效果悬停提示 -->
    <CovenantTooltip />

    <!-- Service Worker 发现新版本时的刷新提示 -->
    <PwaUpdatePrompt />
  </div>
</template>

<script setup>
  import { computed, ref, onMounted, watch } from "vue";

  import PoolPanel from "./components/PoolPanel.vue";
  import EquipmentPool from "./components/EquipmentPool.vue";
  import EquipmentStaging from "./components/EquipmentStaging.vue";
  import TeamPanel from "./components/TeamPanel.vue";
  import SavedTeamsPanel from "./components/SavedTeamsPanel.vue";
  import SaveTeamModal from "./components/SaveTeamModal.vue";
  import ShareModal from "./components/ShareModal.vue";
  import ImportModal from "./components/ImportModal.vue";
  import VersionSwitch from "./components/VersionSwitch.vue";
  import TraitTooltip from "./components/TraitTooltip.vue";
  import CovenantTooltip from "./components/CovenantTooltip.vue";
  import PwaUpdatePrompt from "./components/PwaUpdatePrompt.vue";

  import { useTeamStorage } from "@/composables/useTeamStorage.js";
  import { useShareCode } from "@/composables/useShareCode.js";
  import { useTeamManagement } from "@/composables/useTeamManagement.js";
  import { useModalState } from "@/composables/useModalState.js";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import { DEFAULT_VERSION_ID, getGameVersion } from "@/data/versions.js";
  import { hasEquipmentPool as versionHasEquipmentPool } from "@/data/equipment.js";

  // 游戏版本
  const { currentVersion, currentVersionId, setVersion } = useGameVersion();

  // 标签页常量
  const TABS = {
    POOL: { key: "pool", label: "干员池" },
    EQUIP: { key: "equip", label: "装备池" },
    TEAM: { key: "team", label: "我的编队" },
  };
  const currentTab = ref(TABS.POOL.key);
  const isPoolTab = computed(() => currentTab.value === TABS.POOL.key);
  const isEquipTab = computed(() => currentTab.value === TABS.EQUIP.key);

  /* ------------------------------ 装备池 / 临时装备池 ------------------------------ */

  /** 当前版本是否提供装备（盟约版没有） */
  const hasEquipmentPool = computed(() =>
    versionHasEquipmentPool(currentVersion.value),
  );

  /** 没有装备数据的版本不显示「装备池」标签 */
  const visibleTabs = computed(() =>
    Object.values(TABS).filter(
      (tab) => tab.key !== TABS.EQUIP.key || hasEquipmentPool.value,
    ),
  );

  /** 点击装备后暂存的装备名，等待拖到编队干员身上 */
  const stagedEquipments = ref([]);
  /** 当前选中的装备（点选后再点干员即可装备，触屏友好） */
  const selectedEquipment = ref("");

  const stageEquipment = (name) => {
    if (!name) return;
    if (!stagedEquipments.value.includes(name)) {
      stagedEquipments.value = [...stagedEquipments.value, name];
    }
    selectedEquipment.value = name;
    showTempMessage(`「${name}」已放入临时装备池，拖到干员头像上装备`);
  };

  const selectEquipment = (name) => {
    selectedEquipment.value = selectedEquipment.value === name ? "" : name;
  };

  const unstageEquipment = (name) => {
    stagedEquipments.value = stagedEquipments.value.filter(
      (item) => item !== name,
    );
    if (selectedEquipment.value === name) {
      selectedEquipment.value = "";
    }
  };

  const clearStagedEquipments = () => {
    stagedEquipments.value = [];
    selectedEquipment.value = "";
  };

  /** 装备成功后，把临时装备池里的同一件消耗掉 */
  const handleEquipmentEquipped = ({ name, source }) => {
    if (source === "staging") {
      unstageEquipment(name);
    }
    if (selectedEquipment.value === name) {
      selectedEquipment.value = "";
    }
  };

  // 切到没有装备数据的版本时清空临时装备池，并退回干员池标签
  watch(currentVersionId, () => {
    if (!hasEquipmentPool.value) {
      clearStagedEquipments();
      if (isEquipTab.value) currentTab.value = TABS.POOL.key;
    }
  });

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
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 14px 20px 14px;
    font-family: var(--sans, system-ui, sans-serif);
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    flex: 0 0 auto;
    padding: 0 4px 10px;
  }

  .app-title h1 {
    margin: 0;
    font-size: 18px;
    letter-spacing: 1px;
  }

  .app-title .app-subtitle {
    margin-top: 2px;
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
    gap: 16px;
    flex: 1 1 auto;
    min-height: 0;
  }

  .side-bar {
    display: flex;
    flex-direction: column;
    /* 期望 560px、保底 420px：窗口不够时编队列先缩，操作区永远可用 */
    flex: 1 1 560px;
    min-width: 420px;
    min-height: 0;
    gap: 12px;
    overflow-y: auto;
  }

  /* 右侧：编队 + 临时装备池 */
  .team-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* 期望 800px（8 人一行 + 16 盟约图标），可被压缩折行，绝不挤压操作区 */
    flex: 0 1 800px;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
  }

  .team-col > .my-team {
    min-height: 0;
    /* 列内滚动时不要拉伸出一截空白 */
    flex: 0 0 auto;
  }

  /* 装备池作为独立页面时占满侧栏高度 */
  .equip-page {
    flex: 1 1 auto;
    min-height: 0;
  }

  .tab-list {
    display: flex;
    justify-content: flex-start;
    gap: 6px;
    padding: 0 0 8px;
    font-family: var(--sans, system-ui, sans-serif);
  }

  .tab-item {
    cursor: pointer;
    padding: 7px 16px;
    border-radius: 6px;
    font-size: 14px;
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
    /* 平板/手机恢复整页滚动 */
    .arknights-tool {
      height: auto;
      overflow: visible;
    }

    .container {
      flex-direction: column;
      min-height: 0;
      gap: 16px;
    }

    .side-bar {
      flex: none;
      width: 100%;
      overflow: visible;
    }

    .team-col {
      flex: none;
      width: 100%;
      overflow: visible;
    }
  }

  @media (max-width: 768px) {
    .arknights-tool {
      min-height: 100vh;
      padding: 10px 10px 24px;
    }

    .app-header {
      gap: 10px;
      padding: 0 0 10px;
    }

    .app-title h1 {
      font-size: 17px;
      letter-spacing: 0.5px;
    }

    .app-subtitle {
      margin-top: 4px;
      gap: 6px;
      font-size: 11px;
      line-height: 1.4;
    }

    .container {
      gap: 12px;
    }

    /* 小屏改为上下排列：编队在上，临时装备池在下 */
    .team-col {
      gap: 8px;
    }

    .tab-list {
      padding: 4px 0 10px;
      gap: 6px;
    }

    .tab-item {
      flex: 1;
      text-align: center;
      padding: 9px 10px;
      font-size: 14px;
      background: rgba(255, 255, 255, 0.04);
    }

    .temp-message {
      bottom: 16px;
      max-width: calc(100vw - 32px);
      font-size: 13px;
      padding: 7px 14px;
    }
  }
</style>
