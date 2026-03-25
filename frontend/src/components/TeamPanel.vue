<template>
  <section class="my-team">
    <div class="panel-header">
      <h3>当前编队 ({{ team.length }}/{{ teamLimit }})</h3>
      <div class="limit-setter">
        <label>上限:</label>
        <input
          type="number"
          v-model.number="teamLimitModel"
          min="1"
          max="20"
          @change="handleLimitChange"
          class="limit-input"
        />
      </div>
      <button
        @click="openSaveTeamModal"
        class="new-team-btn"
      >
        保存编队
      </button>
      <button
        @click="clearTeam"
        class="clear-btn"
      >
        清空编队
      </button>
    </div>

    <CovenantsPanel
      :presentCovList="presentCovList"
      :presentCovCounts="presentCovCounts"
    ></CovenantsPanel>

    <VueDraggable
      v-model="teamModel"
      group="ops"
      class="drag-area team-grid"
    >
      <div
        v-for="(op, index) in team"
        :key="index"
        class="op-unit"
      >
        <div class="img-container">
          <img
            :src="op.avatar"
            @error="handleImgError"
          />
          <button
            class="remove-btn"
            @click.stop="removeFromTeam(index)"
          >
            ×
          </button>
        </div>
        <span class="name-label">{{ op.name }}</span>
      </div>
    </VueDraggable>

    <div
      class="active-effects-wrap"
      v-if="activeCovList.length > 0"
    >
      <div
        class="collapse-header"
        @click="isEffectsExpanded = !isEffectsExpanded"
      >
        <span>已激活效果详情 ({{ activeCovList.length }})</span>
        <span
          class="arrow"
          :class="{ rotated: isEffectsExpanded }"
          >▼</span
        >
      </div>
      <div
        class="collapse-content"
        v-show="isEffectsExpanded"
      >
        <ul>
          <li
            v-for="cov in activeCovList"
            :key="cov.name"
          >
            <span class="gold">【{{ cov.name }}】</span>
            <p
              class="activatedListDetails"
              v-for="(effect, i) in cov.effects"
              :key="i"
            >
              · {{ effect.condition }} {{ effect.description }}
            </p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
  import { computed } from "vue";
  import { VueDraggable } from "vue-draggable-plus";
  import CovenantsPanel from "./CovenantsPanel.vue";
  import { handleImgError } from "@/utils/index.js";

  const props = defineProps({
    team: Array,
    teamLimit: Number,
    presentCovList: Array,
    presentCovCounts: Object,
    activeCovList: Array,
    isEffectsExpanded: Boolean,
  });

  const emit = defineEmits([
    "update:team",
    "update:teamLimit",
    "openSaveTeamModal",
    "clearTeam",
    "removeFromTeam",
  ]);

  const teamLimitModel = computed({
    get: () => props.teamLimit,
    set: (value) => emit("update:teamLimit", value),
  });

  const teamModel = computed({
    get: () => props.team,
    set: (value) => emit("update:team", value),
  });

  const isEffectsExpanded = computed({
    get: () => props.isEffectsExpanded,
    set: (value) => emit("update:isEffectsExpanded", value),
  });

  const handleLimitChange = () => {
    if (props.team.length > props.teamLimit) {
      emit("update:team", props.team.slice(0, props.teamLimit));
    }
  };

  const openSaveTeamModal = () => {
    emit("openSaveTeamModal");
  };

  const clearTeam = () => {
    emit("clearTeam");
  };

  const removeFromTeam = (index) => {
    emit("removeFromTeam", index);
  };
</script>

<style scoped>
  .my-team {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .panel-header {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
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

  .team-grid {
    border: 2px dashed #444;
    align-content: flex-start;
  }

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

  .img-container {
    position: relative;
  }

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

  .name-label {
    font-size: 12px;
    display: block;
    margin-top: 5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

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
</style>
