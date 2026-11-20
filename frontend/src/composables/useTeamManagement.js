/**
 * 编队（当前会话）状态
 *
 * 规则判定（上限、截断）在 `src/domain/teamRules.ts`，
 * 这里只维护响应式数组与交互副作用。
 */
import { ref } from "vue";
import { canAddToTeam, exceedsTeamLimit, truncateToLimit } from "@/domain/teamRules";

export function useTeamManagement(teamLimit) {
  /** @type {import('vue').Ref<Array>} 当前编辑中的编队 */
  const team = ref([]);

  /**
   * 加入当前编队
   * @returns {boolean} 是否加入成功；满员时返回 false，由调用方决定怎么提示
   */
  const addToTeam = (op) => {
    if (!canAddToTeam(team.value.length, teamLimit.value)) {
      return false;
    }
    team.value.push({ ...op });
    return true;
  };

  const removeFromTeam = (index) => {
    team.value.splice(index, 1);
  };

  const handleLimitChange = () => {
    if (exceedsTeamLimit(team.value, teamLimit.value)) {
      team.value = truncateToLimit(team.value, teamLimit.value);
    }
  };

  const clearTeam = () => {
    team.value = [];
  };

  const loadTeam = (savedItem) => {
    team.value = [...savedItem.team];
  };

  return {
    team,
    addToTeam,
    removeFromTeam,
    handleLimitChange,
    clearTeam,
    loadTeam,
  };
}
