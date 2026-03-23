/**
 * 盟约统计 Composables
 * 负责：统计编队中各盟约的数量、判断激活状态
 */
import { computed } from "vue";
import operatorsConfig from "../data/operators.json";
import covenantsData from "../data/covenants.json";

/**
 * 统计编队中各盟约的数量
 * @param {Array} team - 编队数组 [{ name, avatar }]
 * @returns {Object} 盟约名称 -> 数量
 */
function countCovenants(team) {
  const stats = {};

  // 获取所有干员的名字（去重）
  const uniqueNames = [...new Set(team.map((op) => op.name))];

  uniqueNames.forEach((name) => {
    const config = operatorsConfig[name];
    if (config?.covenants) {
      config.covenants.forEach((cov) => {
        stats[cov] = (stats[cov] || 0) + 1;
      });
    }
  });

  return stats;
}

/**
 * 获取已激活的盟约列表
 * @param {Object} presentCovCounts - 盟约统计结果
 * @returns {Array} 已激活盟约数组 [{ name, ...covenantsData[name] }]
 */
function getActivatedCovList(presentCovCounts) {
  const activeCovList = [];

  Object.keys(presentCovCounts).forEach((name) => {
    const config = covenantsData[name];
    if (config && presentCovCounts[name] >= config.activateCount) {
      activeCovList.push({ name, ...config });
    }
  });
  return activeCovList;
}

/**
 * 获取编队中出现的盟约（用于排序显示）
 * @param {Object} presentCovCounts - 盟约统计结果
 * @returns {Array} 盟约名称数组，激活的排在前面
 */
function getSortedCovenants(presentCovCounts) {
  return Object.keys(presentCovCounts).sort((a, b) => {
    const aActive =
      presentCovCounts[a] >= (covenantsData[a]?.activateCount || 99);
    const bActive =
      presentCovCounts[b] >= (covenantsData[b]?.activateCount || 99);
    return bActive - aActive;
  });
}

/**
 * 主 composable：传入 team，返回所有盟约相关的计算属性
 * @param {Ref<Array>} teamRef - 编队的响应式引用
 * @returns {Object} 盟约相关的响应式数据
 */
export function useCovenantStats(teamRef) {
  // 盟约统计
  const presentCovCounts = computed(() => countCovenants(teamRef.value));

  // 出现的盟约（排序后）
  const presentCovList = computed(() =>
    getSortedCovenants(presentCovCounts.value),
  );

  // 已激活盟约列表
  const activeCovList = computed(() => getActivatedCovList(presentCovCounts.value));

  // // 获取指定盟约的激活状态
  // const isCovenantActive = (covenantName) => {
  //   const count = presentCovCounts.value[covenantName] || 0;
  //   const config = covenantsData[covenantName];
  //   return config ? count >= config.activateCount : false;
  // };

  // // 获取指定盟约的当前数量
  // const getCovenantCount = (covenantName) => {
  //   return presentCovCounts.value[covenantName] || 0;
  // };

  // // 获取指定盟约需要的数量
  // const getCovenantRequired = (covenantName) => {
  //   return covenantsData[covenantName]?.activateCount || 0;
  // };

  return {
    // 数据
    presentCovCounts, // 所有盟约的统计 { 拉特兰: 2, 精准: 1 }
    presentCovList, // 出现的盟约名称（排序后）
    activeCovList, // 激活的盟约 详情
    // 方法
    // isCovenantActive,
    // getCovenantCount,
    // getCovenantRequired,
  };
}
