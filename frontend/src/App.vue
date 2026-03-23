<template>
  <div class="arknights-tool">
    <main class="container">
      <section class="operator-pool">
        <div class="panel-header column">
          <div class="title-row">
            <h3>干员 ({{ filteredPool.length }})</h3>
          </div>

          <div class="filter-controls">
            <input v-model="searchQuery" placeholder="搜索干员名称..." class="search-input" />

            <select v-model="selectedTier" class="filter-select">
              <option value="">阶数</option>
              <option v-for="t in ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ']" :key="t" :value="t">{{ t }} 阶</option>
            </select>

            <select v-model="selectedMainCov" class="filter-select">
              <option value="">阵营</option>
              <option v-for="name in MAIN_COVENANTS" :key="name" :value="name">{{ name }}</option>
            </select>
            <select v-model="selectedSubCov" class="filter-select">
              <option value="">盟约</option>
              <option v-for="name in SUB_COVENANTS" :key="name" :value="name">{{ name }}</option>
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

      <section class="my-team">
        <div class="panel-header">
          <div class="team-info-group">
            <h3>当前编队 ({{ team.length }}/{{ teamLimit }})</h3>
            <div class="limit-setter">
              <label>上限:</label>
              <input type="number" v-model.number="teamLimit" min="1" max="20" @change="handleLimitChange"
                class="limit-input" />
            </div>
          </div>
          <button @click="team = []" class="clear-btn">清空编队</button>
        </div>

        <CovenantsPanel :presentCovList="presentCovList" :presentCovCounts="presentCovCounts"></CovenantsPanel>

        <VueDraggable v-model="team" group="ops" class="drag-area team-grid">
          <div v-for="(op, index) in team" :key="index" class="op-unit">
            <div class="img-container">
              <img :src="op.avatar" @error="handleImgError" />
              <button class="remove-btn" @click.stop="removeFromTeam(index)">×</button>
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
                <p class="activatedListDetails" v-for="(effect, i) in cov.effects" :key="i">· {{ effect.condition }} {{
                  effect.description }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import CovenantsPanel from './components/CovenantsPanel.vue'
import operatorsConfig from './data/operators.json'
import covenantsData from './data/covenants.json'
import { onMounted } from 'vue';
import { handleImgError, getIconUrl, getAvatarUrl } from '@/utils/index.js';
import { useCovenantStats } from '@/composables/useCovenantStats.js'

// 挂载时设置标题
onMounted(() => {
  document.title = "卫戍协议练功房";
});


// --- 状态数据 ---
const teamLimit = ref(8) // 默认上限 8
const searchQuery = ref('')
const selectedTier = ref('')
// const selectedCovenant = ref('')
const selectedMainCov = ref('')
const selectedSubCov = ref('')

const MAIN_COVENANTS = ['拉特兰', '维多利亚', '炎', '谢拉格', '萨尔贡', '叙拉古', '卡西米尔', '阿戈尔']
const SUB_COVENANTS = ['精准', '迅捷', '灵巧', '奥术', '坚守', '助力', '远见', '奇迹', '投资人', '突袭', '不屈', '调和', '协防干员', '独行']

const team = ref([])
const isEffectsExpanded = ref(false)

// 初始化全量干员列表
const allOperators = Object.keys(operatorsConfig).map((name, index) => ({
  id: index,
  name: name,
  avatar: getAvatarUrl(name),
}))
const operatorPool = ref(allOperators)

// --- 搜索与筛选逻辑 ---
const filteredPool = computed(() => {
  return operatorPool.value.filter(op => {
    const data = operatorsConfig[op.name]

    // 包括即可，模糊搜索
    const matchName = op.name.includes(searchQuery.value)
    const matchTier = selectedTier.value === '' || data.tier === selectedTier.value
    const matchMainCov = selectedMainCov.value === '' || data.covenants.includes(selectedMainCov.value)
    const matchSubCov = selectedSubCov.value === '' || data.covenants.includes(selectedSubCov.value)

    return matchName && matchTier && matchMainCov && matchSubCov
  })
})
// --- 使用盟约 composables ---
const {
  presentCovList, // 出现的盟约名称（排序后）
  presentCovCounts,
  activeCovList,
} = useCovenantStats(team)

// --- 交互动作 ---
const addToTeam = (op) => {
  if (team.value.length < teamLimit.value) {
    team.value.push({ ...op })
  } else {
    alert(`编队已满！当前上限为 ${teamLimit.value}`)
  }
}

const removeFromTeam = (index) => {
  team.value.splice(index, 1)
}

const handleLimitChange = () => {
  if (team.value.length > teamLimit.value) {
    team.value.splice(teamLimit.value)
  }
}

const saveTeam = (e) => {

}
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

/* 筛选区样式 */
.panel-header {
  display: flex;
  justify-content: space-between;
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
  gap: 15px
}

.my-team {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px
}

.drag-area {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 15px;
  background: #181818;
  border: 1px solid #333;
  min-height: 100px;
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

@media (max-width: 1024px) {
  .container {
    flex-direction: column;
    /* 手机端：纵向 */
  }

  .my-team {
    order: 1;
    /* 编队排在第一位，显示在屏幕上方 */
  }

  .operator-pool {
    order: 2;
    /* 干员池排在第二位，显示在下方 */
    width: 90vw;
  }

  .scrollable {
    justify-content: space-evenly;
  }
}
</style>