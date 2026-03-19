<template>
  <div class="arknights-tool">
    <main class="container">
      <section class="operator-pool">
        <div class="panel-header column">
          <div class="title-row">
            <h3>干员储备 ({{ filteredPool.length }})</h3>
          </div>
          
          <div class="filter-controls">
            <input v-model="searchQuery" placeholder="搜索干员名称..." class="search-input" />
            
            <select v-model="selectedTier" class="filter-select">
              <option value="">所有阶数</option>
              <option v-for="t in ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ']" :key="t" :value="t">{{t}} 阶</option>
            </select>

            <select v-model="selectedCovenant" class="filter-select">
              <option value="">所有盟约</option>
              <option v-for="(cfg, name) in covenantsData" :key="name" :value="name">{{name}}</option>
            </select>
          </div>
        </div>
        
        <VueDraggable
          v-model="filteredPool"
          :group="{ name: 'ops', pull: 'clone', put: false }"
          :sort="false"
          class="drag-area scrollable"
        >
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
              <input 
                type="number" 
                v-model.number="teamLimit" 
                min="1" 
                max="20" 
                @change="handleLimitChange"
                class="limit-input"
              />
            </div>
          </div>
          <button @click="team = []" class="clear-btn">清空编队</button>
        </div>

        <section class="covenant-bar" v-if="presentCovenants.length > 0">
          <div 
            v-for="name in presentCovenants" 
            :key="name"
            class="cov-item"
            :class="{ 'is-active': activeStats[name] >= covenantsData[name].activateCount }"
          >
            <div class="icon-wrapper">
              <img class="single-icon" :src="getIconUrl(name)" @error="handleImgError" />
              <span class="badge">{{ activeStats[name] }}</span>
            </div>
            <span class="cov-name">{{ name }}</span>
          </div>
        </section>
        <div v-else class="empty-hint">暂无盟约激活，请添加干员</div>

        <VueDraggable v-model="team" group="ops" class="drag-area team-grid">
          <div v-for="(op, index) in team" :key="index" class="op-unit">
            <div class="img-container">
              <img :src="op.avatar" @error="handleImgError" />
              <button class="remove-btn" @click.stop="removeFromTeam(index)">×</button>
            </div>
            <span class="name-label">{{ op.name }}</span>
          </div>
        </VueDraggable>

        <div class="active-effects-wrap" v-if="activatedList.length > 0">
          <div class="collapse-header" @click="isEffectsExpanded = !isEffectsExpanded">
            <span>已激活效果详情 ({{ activatedList.length }})</span>
            <span class="arrow" :class="{ rotated: isEffectsExpanded }">▼</span>
          </div>
          <div class="collapse-content" v-show="isEffectsExpanded">
            <ul>
              <li v-for="cov in activatedList" :key="cov.name">
                <span class="gold">【{{ cov.name }}】</span>
                <p v-for="(effect, i) in cov.effects" :key="i">· {{ effect.description }}</p>
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

// 数据导入 (请确保路径正确)
import operatorsConfig from './data/operators.json'
import covenantsData from './data/covenants.json'

// --- 状态数据 ---
const teamLimit = ref(8) // 默认上限 8
const searchQuery = ref('')
const selectedTier = ref('')
const selectedCovenant = ref('')
const team = ref([])
const isEffectsExpanded = ref(false)

const getIconUrl = (name) => {
  return `${import.meta.env.BASE_URL}resource/image/盟约_${name}.png`;
}

// 初始化全量干员列表
const allOperators = Object.keys(operatorsConfig).map((name, index) => ({
  id: index,
  name: name,
  avatar: `${import.meta.env.BASE_URL}resource/image/头像_${name}.png`,
}))
const operatorPool = ref(allOperators)

// --- 搜索与筛选逻辑 ---
const filteredPool = computed(() => {
  return operatorPool.value.filter(op => {
    const data = operatorsConfig[op.name]
    const matchName = op.name.includes(searchQuery.value)
    const matchTier = selectedTier.value === '' || data.tier === selectedTier.value
    const matchCov = selectedCovenant.value === '' || data.covenants.includes(selectedCovenant.value)
    return matchName && matchTier && matchCov
  })
})

// --- 盟约逻辑计算 ---
const activeStats = computed(() => {
  const stats = {}
  const uniqueNames = new Set(team.value.map(op => op.name))
  uniqueNames.forEach(name => {
    const config = operatorsConfig[name]
    if (config?.covenants) {
      config.covenants.forEach(cov => {
        stats[cov] = (stats[cov] || 0) + 1
      })
    }
  })
  return stats
})

// 仅获取编队中涉及的盟约并排序
const presentCovenants = computed(() => {
  return Object.keys(activeStats.value).sort((a, b) => {
    const aActive = activeStats.value[a] >= (covenantsData[a]?.activateCount || 99)
    const bActive = activeStats.value[b] >= (covenantsData[b]?.activateCount || 99)
    return bActive - aActive
  })
})

// 已激活的盟约对象列表
const activatedList = computed(() => {
  return Object.keys(activeStats.value)
    .filter(name => {
      const config = covenantsData[name]
      return config && activeStats.value[name] >= config.activateCount
    })
    .map(name => ({ name, ...covenantsData[name] }))
})

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

  const handleImgError = (e) => {
    e.target.src = 'https://placehold.co/60x60?text=None'
  }
</script>

<style scoped>
.arknights-tool {
  background: #121212;
  color: #eee;
  min-height: 100vh;
  padding: 20px;
  font-family: sans-serif;
}

.container { display: flex; gap: 30px; height: 92vh; }

/* 筛选区样式 */
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.panel-header.column { flex-direction: column; align-items: flex-start; gap: 12px; }
.filter-controls { display: flex; gap: 10px; width: 100%; }
.search-input, .filter-select {
  background: #2a2a2a; border: 1px solid #444; color: #fff;
  padding: 8px; border-radius: 4px; font-size: 13px;
}
.search-input { flex: 1; }

/* 干员单元格 */
.op-unit { position: relative; width: 75px; text-align: center; cursor: pointer; }
.op-unit img { width: 100%; aspect-ratio: 1; border-radius: 4px; background: #222; display: block; }
.name-label { font-size: 12px; display: block; margin-top: 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tier-tag { position: absolute; top: 0; left: 0; background: rgba(0,0,0,0.8); color: #ffcf00; font-size: 10px; padding: 1px 4px; border-radius: 4px 0 4px 0; }

/* 盟约展示栏 */
.covenant-bar {
  display: flex; flex-wrap: wrap; gap: 12px;
  background: #1a1a1a; padding: 15px; border: 1px solid #333; margin-bottom: 15px;
}
.cov-item { opacity: 0.4; filter: grayscale(1); transition: 0.3s; text-align: center; width: 45px; }
.cov-item.is-active { opacity: 1; filter: grayscale(0); transform: scale(1.05); }
.icon-wrapper { position: relative; width: 40px; margin: 0 auto; }
.single-icon { max-width: 60px; max-height: 60px; }
.badge { position: absolute; bottom: -4px; right: -4px; background: #ffcf00; color: #000; font-size: 10px; padding: 0 4px; border-radius: 2px; font-weight: bold; }
.cov-name { font-size: 10px; margin-top: 5px; display: block; opacity: 0.8; }
.empty-hint { color: #555; font-style: italic; font-size: 13px; margin-bottom: 15px; }

/* 编队限制调节 */
.team-info-group { display: flex; align-items: center; gap: 15px; }
.limit-setter { display: flex; align-items: center; gap: 6px; background: #333; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
.limit-input { width: 35px; background: transparent; border: none; color: #ffcf00; font-weight: bold; text-align: center; outline: none; }

/* 拖拽区与网格 */
.operator-pool { width: 420px; display: flex; flex-direction: column; }
.my-team { flex: 1; display: flex; flex-direction: column; }
.drag-area { display: flex; flex-wrap: wrap; gap: 15px; padding: 15px; background: #181818; border: 1px solid #333; min-height: 100px; }
.scrollable { overflow-y: auto; flex: 1; }
.team-grid { border: 2px dashed #444; align-content: flex-start; }

/* 功能按钮 */
.remove-btn { position: absolute; top: -6px; right: -6px; background: #ff4d4f; border: none; color: #fff; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-weight: bold; }
.clear-btn { background: transparent; border: 1px solid #555; color: #888; padding: 4px 12px; border-radius: 4px; cursor: pointer; transition: 0.3s; }
.clear-btn:hover { background: #ff4d4f; color: white; border-color: #ff4d4f; }

/* 折叠面板样式 */
.active-effects-wrap { margin-top: auto; border: 1px solid #444; border-radius: 4px; background: #1e1e1e; }
.collapse-header { padding: 12px 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #252525; }
.arrow { transition: 0.3s; font-size: 12px; }
.arrow.rotated { transform: rotate(180deg); }
.collapse-content { padding: 15px; max-height: 250px; overflow-y: auto; }
.collapse-content ul { list-style: none; padding: 0; margin: 0; }
.collapse-content li { margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 8px; }
.collapse-content p { margin: 4px 0; font-size: 13px; color: #bbb; line-height: 1.4; }
.gold { color: #ffcf00; font-weight: bold; margin-bottom: 5px; display: inline-block; }
</style>