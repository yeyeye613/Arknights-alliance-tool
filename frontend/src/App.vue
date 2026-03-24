<template>
  <div class="arknights-tool">
    <main class="container">
      <div class="side-bar">
        <div class="tab-list">
          <div class="tab-item" v-for="(tab, key) in TABS" :key="key" :class="{ active: currentTab === key }"
            @click="currentTab = tab.key">
            {{ tab.label }}
          </div>
        </div>
        <section class="operator-pool" v-if="currentTab === TABS.POOL.key">
          <div class="panel-header column">
            <div class="filter-controls">
              <input v-model="searchQuery" placeholder="搜索干员名称..." class="search-input" />

              <select v-model="selectedTier" class="filter-select">
                <option value="">阶数</option>
                <option v-for="t in ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ']" :key="t" :value="t">
                  {{ t }} 阶
                </option>
              </select>

              <select v-model="selectedMainCov" class="filter-select">
                <option value="">阵营</option>
                <option v-for="name in MAIN_COVENANTS" :key="name" :value="name">
                  {{ name }}
                </option>
              </select>
              <select v-model="selectedSubCov" class="filter-select">
                <option value="">盟约</option>
                <option v-for="name in SUB_COVENANTS" :key="name" :value="name">
                  {{ name }}
                </option>
              </select>
            </div>
          </div>

          <VueDraggable v-model="filteredPool" :group="{ name: 'ops', pull: 'clone', put: false }" :sort="false"
            class="drag-area scrollable">
            <div v-for="op in filteredPool" :key="op.id" class="op-unit" @click="addToTeam(op)">
              <img :src="op.avatar" @error="handleImgError" />
              <span class="name-label">{{ op.name }}</span>
              <span class="tier-tag">{{ operatorsConfig[op.name]?.tier }}</span>
            </div>
          </VueDraggable>
        </section>
        <section class="panel-content" v-if="currentTab === TABS.TEAM.key">
          <div class="saved-teams-header">
            <h3>已保存编队</h3>
            <div class="header-actions">
              <button @click="editMode = !editMode" class="action-btn delete-btn" title="编辑模式">
                {{ editMode ? "完成编辑" : "编辑模式" }}
              </button>
              <button @click.stop="showImportModal = true" class="action-btn share-small-btn" title="导入">
                导入
              </button>
            </div>
          </div>

          <div class="saved-teams-list">
            <div v-for="(collection, collectionIndex) in teamCollections" :key="collectionIndex"
              class="team-collection">
              <div class="collection-header" @click="toggleCollection(collectionIndex)">
                <span class="collection-name">📁 {{ collection.name }} ({{
                  collection.teams.length
                }})</span>
                <div class="collection-actions">
                  <button @click.stop="shareCollection(collection)" v-if="!editMode" class="action-btn share-small-btn"
                    title="分享合集">
                    分享
                  </button>
                  <span class="collection-arrow" :class="{ expanded: collection.expanded }">▼</span>
                </div>
              </div>

              <div v-show="collection.expanded" class="collection-teams">
                <div v-for="(teamItem, teamIndex) in collection.teams" :key="teamIndex" class="saved-team-item">
                  <div class="team-preview">
                    <div class="team-avatars">
                      <img v-for="op in teamItem.team.slice(0, 9)" :key="op.id" :src="op.avatar"
                        class="preview-avatar" />
                      <span v-if="teamItem.team.length > 9" class="more-count">+{{ teamItem.team.length - 10 }}</span>
                    </div>
                    <span class="team-name">{{ teamItem.name }}</span>
                  </div>
                  <div class="team-actions">
                    <button @click="loadTeam(teamItem)" class="action-btn load-btn" v-if="!editMode" title="加载编队">
                      加载
                    </button>
                    <button @click="shareTeam(teamItem)" class="action-btn share-small-btn" v-if="!editMode"
                      title="分享编队">
                      分享
                    </button>
                    <button @click="editTeam(teamItem, collectionIndex, teamIndex)" class="action-btn edit-btn"
                      v-if="editMode" title="编辑">
                      编辑
                    </button>
                    <button @click="moveToCollection(teamItem, index)" class="action-btn move-btn" v-if="editMode"
                      title="移动到合集">
                      移动
                    </button>
                    <button @click="deleteTeam(collectionIndex, teamIndex)" class="action-btn delete-btn"
                      v-if="editMode" title="删除">
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 未归类的独立编队 -->
            <div v-if="savedTeams.length > 0" class="team-collection">
              <div class="collection-header" @click="toggleUngrouped">
                <span class="collection-name">📂 未归类编队 ({{ savedTeams.length }})</span>
                <span class="collection-arrow" :class="{ expanded: ungroupedExpanded }">▼</span>
              </div>

              <div v-show="ungroupedExpanded" class="collection-teams">
                <div v-for="(teamItem, index) in savedTeams" :key="index" class="saved-team-item">
                  <div class="team-preview">
                    <div class="team-avatars">
                      <img v-for="op in teamItem.team.slice(0, 9)" :key="op.id" :src="op.avatar"
                        class="preview-avatar" />
                      <span v-if="teamItem.team.length > 9" class="more-count">+{{ teamItem.team.length - 9 }}</span>
                    </div>
                    <span class="team-name">{{ teamItem.name }}</span>
                  </div>
                  <div class="team-actions">
                    <button @click="loadTeam(teamItem)" class="action-btn load-btn" v-if="!editMode" title="加载编队">
                      加载
                    </button>
                    <button @click="shareTeam(teamItem)" class="action-btn share-small-btn" v-if="!editMode"
                      title="分享编队">
                      分享
                    </button>
                    <button @click="editTeam(teamItem, null, index)" class="action-btn edit-btn" v-if="editMode"
                      title="编辑">
                      编辑
                    </button>
                    <button @click="moveToCollection(teamItem, index)" class="action-btn move-btn" v-if="editMode"
                      title="移动到合集">
                      移动
                    </button>
                    <button @click="deleteTeam(null, index)" class="action-btn delete-btn" v-if="editMode" title="删除">
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="savedTeams.length === 0 && teamCollections.length === 0" class="empty-teams">
              <p>暂无保存的编队</p>
              <p class="empty-hint">点击「新建编队」保存当前编队</p>
            </div>
          </div>
        </section>
      </div>


      <section class="my-team">
        <div class="panel-header">
          <h3>当前编队 ({{ team.length }}/{{ teamLimit }})</h3>
          <div class="limit-setter">
            <label>上限:</label>
            <input type="number" v-model.number="teamLimit" min="1" max="20" @change="handleLimitChange"
              class="limit-input" />
          </div>
          <button @click="openSaveTeamModal" class="new-team-btn">
            保存编队
          </button>
          <button @click="team = []" class="clear-btn">
            清空编队
          </button>
        </div>

        <CovenantsPanel :presentCovList="presentCovList" :presentCovCounts="presentCovCounts"></CovenantsPanel>

        <VueDraggable v-model="team" group="ops" class="drag-area team-grid">
          <div v-for="(op, index) in team" :key="index" class="op-unit">
            <div class="img-container">
              <img :src="op.avatar" @error="handleImgError" />
              <button class="remove-btn" @click.stop="removeFromTeam(index)">
                ×
              </button>
            </div>
            <span class="name-label">{{ op.name }}</span>
          </div>
        </VueDraggable>

        <div class="active-effects-wrap" v-if="activeCovList.length > 0">
          <div class="collapse-header" @click="isEffectsExpanded = !isEffectsExpanded">
            <span>已激活效果详情 ({{ activeCovList.length }})</span>
            <span class="arrow" :class="{ rotated: isEffectsExpanded }">▼</span>
          </div>
          <div class="collapse-content" v-show="isEffectsExpanded">
            <ul>
              <li v-for="cov in activeCovList" :key="cov.name">
                <span class="gold">【{{ cov.name }}】</span>
                <p class="activatedListDetails" v-for="(effect, i) in cov.effects" :key="i">
                  · {{ effect.condition }} {{ effect.description }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
    <!-- 新建/编辑编队弹窗 -->
    <div v-if="showTeamModal" class="modal-overlay" @click.self="closeTeamModal">
      <div class="modal-content">
        <h3>{{ editingTeam ? "以当前编队替换" : "保存编队" }}</h3>
        <input v-model="teamName" placeholder="编队名称" class="modal-input" />

        <div v-if="!editingTeam" class="collection-select">
          <label>选择合集（可选）</label>
          <select v-model="selectedCollection">
            <option value="">未归类</option>
            <option v-for="(collection, index) in teamCollections" :key="index" :value="collection.name">
              {{ collection.name }}
            </option>
          </select>
          <button @click="showNewCollectionInput = true" class="new-collection-btn">
            新建合集
          </button>
        </div>

        <div v-if="showNewCollectionInput" class="new-collection-input">
          <input v-model="newCollectionName" placeholder="合集名称" class="modal-input" />
          <button @click="createNewCollection" class="confirm-btn">
            确认
          </button>
          <button @click="showNewCollectionInput = false" class="cancel-btn">
            取消
          </button>
        </div>

        <div class="modal-actions">
          <button @click="saveCurrentTeam" class="confirm-btn">
            确认
          </button>
          <button @click="closeTeamModal" class="cancel-btn">
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 分享弹窗 -->
    <div v-if="showShareModal" class="modal-overlay" @click.self="closeImportModal">
      <div class="modal-content share-modal">
        <h3>
          {{ shareType === "team" ? "分享编队" : "分享合集" }}
        </h3>
        <div class="share-code-container">
          <textarea readonly v-model="shareCode" class="share-code" rows="4" @click="copyShareCode"></textarea>
          <button @click="copyShareCode" class="copy-btn">
            复制密语
          </button>
        </div>
        <div class="modal-actions">
          <button @click="closeImportModal" class="cancel-btn">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 导入弹窗 -->
    <div v-if="showImportModal" class="import-section modal-overlay" @click.self="closeImportModal">
      <div class="modal-content share-modal">
        <h3>导入密语</h3>
        <textarea v-model="importCode" placeholder="粘贴密语..." class="import-code" rows="3"></textarea>
        <button @click="importFromCode" class="import-btn">
          导入
        </button>
      </div>
    </div>
    <!-- 临时提示消息 -->
    <div v-if="tempMessage" class="temp-message">
      {{ tempMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import pako from "pako";

import CovenantsPanel from "./components/CovenantsPanel.vue";
import operatorsConfig from "./data/operators.json";
import covenantsData from "./data/covenants.json";
import { onMounted } from "vue";
import { handleImgError, getIconUrl, getAvatarUrl } from "@/utils/index.js";
import { useCovenantStats } from "@/composables/useCovenantStats.js";

// 挂载时设置标题
onMounted(() => {
  document.title = "卫戍协议练功房";
  initSavedTeams();
});

// 标签页常量
const TABS = {
  POOL: { key: "pool", label: "干员池" },
  TEAM: { key: "team", label: "我的编队" },
};
const currentTab = ref(TABS.POOL.key);

// 新增：保存编队相关状态
const openSaveModal = ref(false); // 保存弹窗开关
const saveTeamName = ref(""); // 编队名称
const savedTeams = ref([]); // 已保存的编队列表
const editMode = ref(false);

// --- 状态数据 ---
const teamLimit = ref(8); // 默认上限 8
const searchQuery = ref("");
const selectedTier = ref("");
const selectedMainCov = ref("");
const selectedSubCov = ref("");

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

const team = ref([]);
const isEffectsExpanded = ref(false);

// 初始化全量干员列表
const allOperators = Object.keys(operatorsConfig).map((name, index) => ({
  id: index,
  name: name,
  avatar: getAvatarUrl(name),
}));
const operatorPool = ref(allOperators);

// --- 搜索与筛选逻辑 ---
const filteredPool = computed(() => {
  return operatorPool.value.filter((op) => {
    const data = operatorsConfig[op.name];

    // 包括即可，模糊搜索
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
// --- 使用盟约 composables ---
const {
  presentCovList, // 出现的盟约名称（排序后）
  presentCovCounts,
  activeCovList,
} = useCovenantStats(team);

// --- 交互动作 ---
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
  currentTab.value = TABS.TEAM.key; // 自动切到编队标签页
};

// 编队管理相关状态
const showTeamModal = ref(false);
const teamName = ref("");
const editingTeam = ref(null); // 存储正在编辑的编队信息
const editingLocation = ref(null); // 存储编辑位置 { collectionIndex, teamIndex }
const selectedCollection = ref("");
const showNewCollectionInput = ref(false);
const newCollectionName = ref("");
const ungroupedExpanded = ref(true);

// 分享相关状态
const showShareModal = ref(false);
const showImportModal = ref(false);
const shareType = ref("");
const shareCode = ref("");
const importCode = ref("");
const fullShareCode = ref("");
const fullImportCode = ref("");
const currentShareTeam = ref(null);
const currentShareCollection = ref(null);

// 编队合集数据结构
const teamCollections = ref([]);

// 初始化加载已保存的编队和合集
const initSavedTeams = () => {
  const saved = localStorage.getItem("arknights_saved_teams");
  if (saved) {
    savedTeams.value = JSON.parse(saved);
  }

  const collections = localStorage.getItem("arknights_team_collections");
  if (collections) {
    const parsed = JSON.parse(collections);
    teamCollections.value = parsed.map((c) => ({ ...c, expanded: true }));
  }
};

// 保存合集到 localStorage
const saveCollections = () => {
  const collectionsToSave = teamCollections.value.map(
    ({ expanded, ...rest }) => rest,
  );
  localStorage.setItem(
    "arknights_team_collections",
    JSON.stringify(collectionsToSave),
  );
};

// 保存所有数据到 localStorage
const saveAllData = () => {
  localStorage.setItem(
    "arknights_saved_teams",
    JSON.stringify(savedTeams.value),
  );
  const collectionsToSave = teamCollections.value.map(
    ({ expanded, ...rest }) => rest,
  );
  localStorage.setItem(
    "arknights_team_collections",
    JSON.stringify(collectionsToSave),
  );
};

// 打开保存编队弹窗
const openSaveTeamModal = () => {
  if (team.value.length === 0) {
    alert("当前编队为空，无法保存");
    return;
  }
  teamName.value = "";
  editingTeam.value = null;
  selectedCollection.value = "";
  showTeamModal.value = true;
};

// 关闭弹窗
const closeTeamModal = () => {
  showTeamModal.value = false;
  teamName.value = "";
  editingTeam.value = null;
  selectedCollection.value = "";
  showNewCollectionInput.value = false;
  newCollectionName.value = "";
};

// 创建新合集
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
  newCollectionName.value = "";
  showNewCollectionInput.value = false;
  selectedCollection.value =
    teamCollections.value[teamCollections.value.length - 1].name;
};

// 保存当前编队
const saveCurrentTeam = () => {
  if (!teamName.value.trim()) {
    alert("请输入编队名称");
    return;
  }

  const newTeam = {
    name: teamName.value.trim(),
    team: [...team.value],
    createTime: new Date().toLocaleString(),
  };

  if (editingTeam.value) {
    const { collectionIndex, teamIndex } = editingLocation.value;
    if (collectionIndex !== null) {
      teamCollections.value[collectionIndex].teams[teamIndex] = newTeam;
      saveCollections();
    } else {
      savedTeams.value[teamIndex] = newTeam;
      localStorage.setItem(
        "arknights_saved_teams",
        JSON.stringify(savedTeams.value),
      );
    }
  } else {
    if (selectedCollection.value) {
      const collection = teamCollections.value.find(
        (c) => c.name === selectedCollection.value,
      );
      if (collection) {
        collection.teams.push(newTeam);
        saveCollections();
      }
    } else {
      savedTeams.value.push(newTeam);
      localStorage.setItem(
        "arknights_saved_teams",
        JSON.stringify(savedTeams.value),
      );
    }
  }

  closeTeamModal();
  showTempMessage("编队保存成功");
};

// 编辑编队
const editTeam = (teamItem, collectionIndex, teamIndex) => {
  teamName.value = teamItem.name;
  editingTeam.value = teamItem;
  editingLocation.value = { collectionIndex, teamIndex };
  showTeamModal.value = true;
};

// 删除编队
const deleteTeam = (collectionIndex, teamIndex) => {
  if (collectionIndex !== null) {
    teamCollections.value[collectionIndex].teams.splice(teamIndex, 1);
    if (teamCollections.value[collectionIndex].teams.length === 0) {
      teamCollections.value.splice(collectionIndex, 1);
    }
    saveCollections();
  } else {
    savedTeams.value.splice(teamIndex, 1);
    localStorage.setItem(
      "arknights_saved_teams",
      JSON.stringify(savedTeams.value),
    );
  }
  showTempMessage("编队已删除");
};

// 移动编队到合集
const moveToCollection = (teamItem, index) => {
  const collectionName = prompt("请输入合集名称：", "");
  if (!collectionName) return;

  let collection = teamCollections.value.find(
    (c) => c.name === collectionName,
  );
  if (!collection) {
    collection = { name: collectionName, teams: [], expanded: true };
    teamCollections.value.push(collection);
  }

  collection.teams.push(teamItem);
  savedTeams.value.splice(index, 1);

  localStorage.setItem(
    "arknights_saved_teams",
    JSON.stringify(savedTeams.value),
  );
  saveCollections();
  showTempMessage(`已移动到合集「${collectionName}」`);
};

// 切换合集展开/收缩
const toggleCollection = (index) => {
  teamCollections.value[index].expanded =
    !teamCollections.value[index].expanded;
};

const toggleUngrouped = () => {
  ungroupedExpanded.value = !ungroupedExpanded.value;
};

// ==================== 密语分享功能 ====================

// 生成编队密语
const generateTeamCode = (teamData) => {
  try {
    // 只保存必要的干员信息：名称和ID
    const compactTeam = {
      v: 1, // 版本号
      t: "team",
      n: teamData.name,
      ops: teamData.team.map((op) => op.name),
    };
    const jsonStr = JSON.stringify(compactTeam);
    const compressed = pako.deflate(jsonStr, { level: 9 });
    const base64 = btoa(String.fromCharCode.apply(null, compressed));
    return `ARKTEAM${base64}`;
  } catch (error) {
    console.error("生成密语失败:", error);
    return null;
  }
};

// 生成合集密语
const generateCollectionCode = (collection) => {
  try {
    const compactCollection = {
      v: 1,
      t: "collection",
      n: collection.name,
      teams: collection.teams.map((team) => ({
        n: team.name,
        ops: team.team.map((op) => op.name),
      })),
    };
    const jsonStr = JSON.stringify(compactCollection);
    const compressed = pako.deflate(jsonStr, { level: 9 });
    const base64 = btoa(String.fromCharCode.apply(null, compressed));
    return `ARKCOL${base64}`;
  } catch (error) {
    console.error("生成合集密语失败:", error);
    return null;
  }
};

// 生成全部数据密语
const generateFullCode = () => {
  try {
    const fullData = {
      v: 1,
      t: "full",
      teams: savedTeams.value.map((team) => ({
        n: team.name,
        ops: team.team.map((op) => op.name),
      })),
      collections: teamCollections.value.map((collection) => ({
        n: collection.name,
        teams: collection.teams.map((team) => ({
          n: team.name,
          ops: team.team.map((op) => op.name),
        })),
      })),
    };
    const jsonStr = JSON.stringify(fullData);
    const compressed = pako.deflate(jsonStr, { level: 9 });
    const base64 = btoa(String.fromCharCode.apply(null, compressed));
    return `ARKFULL${base64}`;
  } catch (error) {
    console.error("生成完整密语失败:", error);
    return null;
  }
};

// 解析密语
const parseCode = (code) => {
  try {
    let prefix, base64Data;

    if (code.startsWith("ARKTEAM")) {
      prefix = "ARKTEAM";
      base64Data = code.slice(7);
    } else if (code.startsWith("ARKCOL")) {
      prefix = "ARKCOL";
      base64Data = code.slice(6);
    } else if (code.startsWith("ARKFULL")) {
      prefix = "ARKFULL";
      base64Data = code.slice(7);
    } else {
      throw new Error("无效的密语格式");
    }

    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decompressed = pako.inflate(bytes, { to: "string" });
    const data = JSON.parse(decompressed);

    if (data.v !== 1) {
      throw new Error("不支持的版本");
    }

    return data;
  } catch (error) {
    console.error("解析密语失败:", error);
    throw new Error("密语解析失败，请检查格式是否正确");
  }
};

// 从干员名称列表恢复完整干员对象
const restoreOperators = (names) => {
  return names
    .map((name, idx) => {
      const opData = operatorsConfig[name];
      if (!opData) {
        console.warn(`未找到干员: ${name}`);
        return null;
      }
      return {
        id: idx,
        name: name,
        avatar: getAvatarUrl(name),
      };
    })
    .filter((op) => op !== null);
};

// 导入编队
const importTeam = (data) => {
  const teamOps = restoreOperators(data.ops);
  if (teamOps.length === 0) {
    throw new Error("编队中没有有效干员");
  }

  const newTeam = {
    name: data.n,
    team: teamOps,
    createTime: new Date().toLocaleString(),
  };

  savedTeams.value.push(newTeam);
  localStorage.setItem(
    "arknights_saved_teams",
    JSON.stringify(savedTeams.value),
  );
  return newTeam;
};

// 导入合集
const importCollection = (data) => {
  const teams = data.teams
    .map((teamData) => {
      const teamOps = restoreOperators(teamData.ops);
      return {
        name: teamData.n,
        team: teamOps,
        createTime: new Date().toLocaleString(),
      };
    })
    .filter((team) => team.team.length > 0);

  if (teams.length === 0) {
    throw new Error("合集中没有有效编队");
  }

  const newCollection = {
    name: data.n,
    teams: teams,
    expanded: true,
  };

  teamCollections.value.push(newCollection);
  saveCollections();
  return newCollection;
};

// 分享单个编队
const shareTeam = (teamItem) => {
  currentShareTeam.value = teamItem;
  shareType.value = "team";
  const code = generateTeamCode(teamItem);
  if (code) {
    shareCode.value = code;
    showShareModal.value = true;
  } else {
    showTempMessage("生成分享码失败");
  }
};

// 分享合集
const shareCollection = (collection) => {
  currentShareCollection.value = collection;
  shareType.value = "collection";
  const code = generateCollectionCode(collection);
  if (code) {
    shareCode.value = code;
    showShareModal.value = true;
  } else {
    showTempMessage("生成分享码失败");
  }
};

// 从密语导入
const importFromCode = () => {
  if (!importCode.value.trim()) {
    showTempMessage("请输入密语");
    return;
  }

  try {
    const data = parseCode(importCode.value.trim());

    if (data.t === "team") {
      const newTeam = importTeam(data);
      showTempMessage(`成功导入编队「${newTeam.name}」`);
    } else if (data.t === "collection") {
      const newCollection = importCollection(data);
      showTempMessage(`成功导入合集「${newCollection.name}」`);
    } else {
      showTempMessage("不支持的密语类型");
    }

    importCode.value = "";
    closeImportModal();
  } catch (error) {
    showTempMessage(error.message || "导入失败");
  }
};

// 复制分享码
const copyShareCode = async () => {
  try {
    await navigator.clipboard.writeText(shareCode.value);
    showTempMessage("密语已复制到剪贴板");
  } catch (error) {
    showTempMessage("复制失败，请手动复制");
  }
};

// 复制完整分享码
const copyFullShareCode = async () => {
  try {
    await navigator.clipboard.writeText(fullShareCode.value);
    showTempMessage("密语已复制到剪贴板");
  } catch (error) {
    showTempMessage("复制失败，请手动复制");
  }
};

// 关闭分享弹窗
const closeImportModal = () => {
  showImportModal.value = false;
  showShareModal.value = false;
  shareCode.value = "";
  importCode.value = "";
  currentShareTeam.value = null;
  currentShareCollection.value = null;
};

// 临时消息提示
const tempMessage = ref("");
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
}

.preview-avatar {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: #333;
  object-fit: cover;
}

.more-count {
  font-size: 10px;
  background: #444;
  padding: 2px 4px;
  border-radius: 3px;
  margin-left: 2px;
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
