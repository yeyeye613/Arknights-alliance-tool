import { ref } from "vue";

export function useTeamManagement(teamLimit) {
  const team = ref([]);

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
