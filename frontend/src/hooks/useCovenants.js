import { computed } from 'vue'

export function useCovenants(team, covenantsConfig, operatorsConfig) {
  // 1. 计算当前队伍中各盟约的人数统计
  const activeStats = computed(() => {
    const stats = {};
    
    // 卫戍协议通常按“不同干员”计数
    const uniqueNames = new Set(team.value.map(op => op.name));
    
    uniqueNames.forEach(name => {
      const opData = operatorsConfig[name];
      if (opData && opData.covenants) {
        opData.covenants.forEach(covName => {
          stats[covName] = (stats[covName] || 0) + 1;
        });
      }
    });
    return stats;
  });

  // 2. 判定哪些盟约达到了激活门槛
  const activatedCovenants = computed(() => {
    const result = [];
    for (const [name, count] of Object.entries(activeStats.value)) {
      const config = covenantsConfig[name];
      if (config && count >= config.activateCount) {
        result.push({
          name,
          currentCount: count,
          config: config
        });
      }
    }
    return result;
  });

  return { activeStats, activatedCovenants };
}