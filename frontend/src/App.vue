<template>
  <div class="arknights-tool">
    <main class="container">
      <div class="side-bar">
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
          :operator-pool="operatorPool"
          :search-query="searchQuery"
          :selected-tier="selectedTier"
          :selected-main-cov="selectedMainCov"
          :selected-sub-cov="selectedSubCov"
          :MAIN_COVENANTS="MAIN_COVENANTS"
          :SUB_COVENANTS="SUB_COVENANTS"
          @update:search-query="searchQuery = $event"
          @update:selected-tier="selectedTier = $event"
          @update:selected-main-cov="selectedMainCov = $event"
          @update:selected-sub-cov="selectedSubCov = $event"
          @add-to-team="addToTeam"
        />

        <SavedTeamsPanel
          v-if="currentTab === TABS.TEAM.key"
          :saved-teams="savedTeams"
          :team-collections="teamCollections"
          @load-team="loadTeam"
          @share-team="shareTeam"
          @share-collection="shareCollection"
          @edit-team="editTeam"
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
        :is-effects-expanded="isEffectsExpanded"
        @update:team="team = $event"
        @update:team-limit="
          (value) => {
            teamLimit.value = value;
            handleLimitChange();
          }
        "
        @update:is-effects-expanded="
          (value) => {
            isEffectsExpanded.value = value;
          }
        "
        @open-save-team-modal="openSaveTeamModal"
        @clear-team="team = []"
        @remove-from-team="removeFromTeam"
      />
    </main>

    <SaveTeamModal
      :show="showTeamModal"
      :current-team="team"
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
      @save="saveTeam"
      @update="updateTeam"
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
  import { ref, computed, onMounted } from "vue";
  import { VueDraggable } from "vue-draggable-plus";

  import PoolPanel from "./components/PoolPanel.vue";
  import TeamPanel from "./components/TeamPanel.vue";
  import SavedTeamsPanel from "./components/SavedTeamsPanel.vue";
  import SaveTeamModal from "./components/SaveTeamModal.vue";
  import ShareModal from "./components/ShareModal.vue";
  import ImportModal from "./components/ImportModal.vue";
  import CovenantsPanel from "./components/CovenantsPanel.vue";

  import operatorsConfig from "./data/operators.json";
  import { handleImgError, getAvatarUrl } from "@/utils/index.js";
  import { useCovenantStats } from "@/composables/useCovenantStats.js";
  import { useTeamStorage } from "@/composables/useTeamStorage.js";
  import { useShareCode } from "@/composables/useShareCode.js";

  // 标签页常量
  const TABS = {
    POOL: { key: "pool", label: "干员池" },
    TEAM: { key: "team", label: "我的编队" },
  };
  const currentTab = ref(TABS.POOL.key);

  // 筛选状态
  const teamLimit = ref(8);
  const searchQuery = ref("");
  const selectedTier = ref("");
  const selectedMainCov = ref("");
  const selectedSubCov = ref("");

  // 盟约常量
  const MAIN_COVENANTS = [
    "拉特兰",
    "维多利亚",
    "炎",
    "谢拉格",
    "萨尔贡",
    "叙拉古",
    "卡西米尔",
    "阿戈尔",
  ];
  const SUB_COVENANTS = [
    "精准",
    "迅捷",
    "灵巧",
    "奥术",
    "坚守",
    "助力",
    "远见",
    "奇迹",
    "投资人",
    "突袭",
    "不屈",
    "调和",
    "协防干员",
    "独行",
  ];

  // 主要状态
  const team = ref([]);
  const isEffectsExpanded = ref(false);

  // 共享/存储状态
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
    parseCode,
    importTeam: createTeamFromData,
    importCollection: createCollectionFromData,
  } = useShareCode();

  // UI 状态
  const showTeamModal = ref(false);
  const teamName = ref("");
  const editingTeam = ref(null);
  const editingLocation = ref(null);
  const selectedCollection = ref("");
  const showNewCollectionInput = ref(false);
  const newCollectionName = ref("");

  const showShareModal = ref(false);
  const showImportModal = ref(false);
  const shareType = ref("");
  const shareCode = ref("");
  const importCode = ref("");
  const currentShareTeam = ref(null);
  const currentShareCollection = ref(null);

  const tempMessage = ref("");

  // 初始化
  onMounted(() => {
    document.title = "卫戍协议练功房";
    initSavedTeams();
  });

  // 干员池处理
  const allOperators = Object.keys(operatorsConfig).map((name, index) => ({
    id: index,
    name,
    avatar: getAvatarUrl(name),
  }));
  const operatorPool = ref(allOperators);

  const filteredPool = computed(() => {
    return operatorPool.value.filter((op) => {
      const data = operatorsConfig[op.name];
      const matchName = op.name.includes(searchQuery.value);
      const matchTier =
        selectedTier.value === "" || data.tier === selectedTier.value;
      const matchMainCov =
        selectedMainCov.value === "" ||
        data.covenants.includes(selectedMainCov.value);
      const matchSubCov =
        selectedSubCov.value === "" ||
        data.covenants.includes(selectedSubCov.value);
      return matchName && matchTier && matchMainCov && matchSubCov;
    });
  });

  // 盟约统计
  const { presentCovList, presentCovCounts, activeCovList } =
    useCovenantStats(team);

  // 交互
  const addToTeam = (op) => {
    if (team.value.length < teamLimit.value) {
      team.value.push({ ...op });
    } else {
      alert(`编队已满！当前上限为 ${teamLimit.value}`);
    }
  };

  const removeFromTeam = (index) => {
    team.value.splice(index, 1);
  };

  const handleLimitChange = () => {
    if (team.value.length > teamLimit.value) {
      team.value.splice(teamLimit.value);
    }
  };

  const loadTeam = (savedItem) => {
    team.value = [...savedItem.team];
    currentTab.value = TABS.TEAM.key;
  };

  // 集合编辑功能
  const openSaveTeamModal = () => {
    if (!team.value.length) {
      alert("当前编队为空，无法保存");
      return;
    }
    teamName.value = "";
    editingTeam.value = null;
    editingLocation.value = null;
    selectedCollection.value = "";
    showTeamModal.value = true;
  };

  const closeTeamModal = () => {
    showTeamModal.value = false;
    teamName.value = "";
    editingTeam.value = null;
    editingLocation.value = null;
    selectedCollection.value = "";
    showNewCollectionInput.value = false;
    newCollectionName.value = "";
  };

  const createNewCollection = () => {
    if (!newCollectionName.value.trim()) {
      alert("请输入合集名称");
      return;
    }
    teamCollections.value.push({
      name: newCollectionName.value.trim(),
      teams: [],
      expanded: true,
    });
    saveCollections();
    selectedCollection.value = newCollectionName.value.trim();
    newCollectionName.value = "";
    showNewCollectionInput.value = false;
  };

  const saveTeam = (teamData) => {
    const newTeam = {
      name: teamData.name,
      team: [...teamData.team],
      createTime: new Date().toLocaleString(),
    };

    addOrUpdateTeam({
      newTeam,
      collectionName:
        teamData.collectionIndex !== null
          ? teamCollections.value[teamData.collectionIndex]?.name
          : null,
      editingLocation: null,
    });

    closeTeamModal();
    showTempMessage("编队保存成功");
  };

  const updateTeam = (teamData) => {
    const updatedTeam = {
      name: teamData.name,
      team: [...team.value], // Use current team instead of saved team
      createTime: new Date().toLocaleString(),
    };

    addOrUpdateTeam({
      newTeam: updatedTeam,
      collectionName:
        teamData.collectionIndex !== null
          ? teamCollections.value[teamData.collectionIndex]?.name
          : null,
      editingLocation:
        teamData.originalIndex !== undefined
          ? {
              collectionIndex: teamData.originalCollectionIndex,
              teamIndex: teamData.originalIndex,
            }
          : null,
    });

    closeTeamModal();
    showTempMessage("编队更新成功");
  };

  const editTeam = (teamItem, collectionIndex, teamIndex) => {
    teamName.value = teamItem.name;
    editingTeam.value = teamItem;
    editingLocation.value = { collectionIndex, teamIndex };
    showTeamModal.value = true;
  };

  const deleteTeam = (collectionIndex, teamIndex) => {
    deleteStoredTeam({ collectionIndex, teamIndex });
    showTempMessage("编队已删除");
  };

  const moveToCollection = (teamItem, index) => {
    const collectionName = prompt("请输入合集名称：", "");
    if (!collectionName) return;

    moveStoredTeam({
      teamItem,
      savedIndex: index,
      targetCollectionName: collectionName,
    });
    showTempMessage(`已移动到合集「${collectionName}」`);
  };

  // 分享
  const shareTeam = (teamItem) => {
    currentShareTeam.value = { ...teamItem, type: "team" };
    shareType.value = "team";
    const code = generateTeamCode(teamItem);
    if (code) {
      shareCode.value = code;
      showShareModal.value = true;
    } else {
      showTempMessage("生成分享码失败");
    }
  };

  const shareCollection = (collection) => {
    currentShareCollection.value = { ...collection, type: "collection" };
    shareType.value = "collection";
    const code = generateCollectionCode(collection);
    if (code) {
      shareCode.value = code;
      showShareModal.value = true;
    } else {
      showTempMessage("生成分享码失败");
    }
  };

  const importFromCode = (data) => {
    try {
      const key = data.t || data.type;
      if (key === "team") {
        const newTeam = createTeamFromData(data);
        savedTeams.value.push(newTeam);
        saveAllData();
        showTempMessage(`成功导入编队「${newTeam.name}」`);
      } else if (key === "collection") {
        const importedCollection = createCollectionFromData(data);
        teamCollections.value.push(importedCollection);
        saveCollections();
        showTempMessage(`成功导入合集「${importedCollection.name}」`);
      } else {
        showTempMessage("不支持的数据类型");
      }

      closeImportModal();
    } catch (error) {
      showTempMessage(error.message || "导入失败");
    }
  };

  const closeShareModal = () => {
    showShareModal.value = false;
    shareCode.value = "";
    currentShareTeam.value = null;
    currentShareCollection.value = null;
  };

  const closeImportModal = () => {
    showImportModal.value = false;
    importCode.value = "";
  };

  const showTempMessage = (msg) => {
    tempMessage.value = msg;
    setTimeout(() => {
      tempMessage.value = "";
    }, 2000);
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

  /* 筛选区样式 */
  .panel-header {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  .panel-header.column {
    flex-direction: column;
    gap: 12px;
  }

  .filter-controls {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .search-input,
  .filter-select {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 8px;
    border-radius: 4px;
    font-size: 13px;
    min-width: 20%;
  }

  .search-input {
    flex: 1;
    min-width: 20%;
  }

  /* 干员单元格 */
  .op-unit {
    position: relative;
    width: 75px;
    text-align: center;
    cursor: pointer;
  }

  .op-unit img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 4px;
    background: #222;
    display: block;
  }

  .name-label {
    font-size: 12px;
    display: block;
    margin-top: 5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .tier-tag {
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.8);
    color: #ffcf00;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 4px 0 4px 0;
  }

  /* 编队限制调节 */
  .team-info-group {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .limit-setter {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #333;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
  }

  .limit-input {
    width: 35px;
    background: transparent;
    border: none;
    color: #ffcf00;
    font-weight: bold;
    text-align: center;
    outline: none;
  }

  /* 拖拽区与网格 */
  .operator-pool {
    width: 30vw;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .panel-content {
    width: 30vw;
  }

  .my-team {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .drag-area {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    padding: 15px;
    background: #181818;
    border: 1px solid #333;
    min-height: 100px;
    max-height: 80vh;
    align-content: flex-start;
  }

  .scrollable {
    overflow-y: auto;
    flex: 1;
  }

  .team-grid {
    border: 2px dashed #444;
    align-content: flex-start;
  }

  /* 功能按钮 */
  .remove-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #ff4d4f;
    border: none;
    color: #fff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    cursor: pointer;
    font-weight: bold;
  }

  .clear-btn {
    background: transparent;
    border: 1px solid #555;
    color: #888;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: 0.3s;
  }

  .clear-btn:hover {
    background: #ff4d4f;
    color: white;
    border-color: #ff4d4f;
  }

  /* 折叠面板样式 */
  .active-effects-wrap {
    margin-top: auto;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1e1e1e;
  }

  .collapse-header {
    padding: 12px 15px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #252525;
  }

  .arrow {
    transition: 0.3s;
    font-size: 12px;
  }

  .arrow.rotated {
    transform: rotate(180deg);
  }

  .collapse-content {
    padding: 15px;
    max-height: 250px;
    overflow-y: auto;
  }

  .collapse-content ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .collapse-content li {
    margin-bottom: 12px;
    border-bottom: 1px solid #333;
    padding-bottom: 8px;
  }

  .collapse-content p {
    margin: 4px 0;
    font-size: 13px;
    color: #bbb;
    line-height: 1.4;
  }

  .gold {
    color: #ffcf00;
    font-weight: bold;
    margin-bottom: 5px;
    display: inline-block;
  }

  .activatedListDetails {
    text-align: left;
  }

  /* 在 style 中添加以下样式 */

  /* 编队列表样式 */
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

  .new-team-btn {
    background: #ffcf00;
    color: #121212;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: 0.3s;
  }

  .new-team-btn:hover {
    background: #ffdd44;
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
    overflow: hidden;
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

  .action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    transition: 0.2s;
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

  .empty-hint {
    font-size: 12px;
    margin-top: 8px;
  }

  /* 模态框样式 */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #1e1e1e;
    border-radius: 12px;
    padding: 24px;
    min-width: 320px;
    max-width: 400px;
    border: 1px solid #444;
  }

  .modal-content h3 {
    margin: 0 0 16px 0;
    color: #ffcf00;
  }

  .modal-input {
    width: 100%;
    padding: 10px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 6px;
    color: #fff;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .modal-input:focus {
    outline: none;
    border-color: #ffcf00;
  }

  .collection-select {
    margin-bottom: 12px;
  }

  .collection-select label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    color: #aaa;
  }

  .collection-select select {
    width: 100%;
    padding: 8px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    margin-bottom: 8px;
  }

  .new-collection-btn {
    background: transparent;
    border: 1px solid #ffcf00;
    color: #ffcf00;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .new-collection-input {
    margin-bottom: 16px;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .confirm-btn {
    background: #ffcf00;
    color: #121212;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid #666;
    color: #aaa;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
  }

  /* 临时提示消息 */
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

  /* 保留原有样式，添加新增样式 */

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .share-btn {
    background: #4caf50;
    color: white;
    padding: 4px 12px;
    border-radius: 4px;
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

  .collection-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .share-modal {
    min-width: 450px;
    max-width: 600px;
  }

  .share-code-container {
    margin-bottom: 20px;
  }

  .share-code,
  .import-code {
    width: 100%;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 6px;
    color: #ffcf00;
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    resize: vertical;
  }

  .share-code {
    cursor: pointer;
  }

  .share-code:hover {
    background: #333;
  }

  .copy-btn,
  .import-btn {
    margin-top: 8px;
    background: #ffcf00;
    color: #121212;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }

  .import-section h4 {
    margin: 16px 0 8px 0;
    font-size: 14px;
    color: #aaa;
  }

  .import-warning {
    font-size: 11px;
    color: #ff9800;
    margin-top: 8px;
  }

  @media (max-width: 1024px) {
    .container {
      flex-direction: column;
      /* 手机端：纵向 */
    }

    .my-team {
      order: 1;
      /* 编队排在第一位，显示在屏幕上方 */
    }

    .side-bar {
      order: 2;
      /* 干员池排在第二位，显示在下方 */
      width: 90vw;
    }

    .operator-pool {
      width: 90vw;
    }

    .panel-content {
      width: 90vw;
    }

    .share-modal {
      min-width: 90vw;
      max-width: 90vw;
    }
  }
</style>
