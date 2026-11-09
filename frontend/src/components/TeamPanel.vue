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
          @input="teamLimitModel = Math.max(1, Math.min(20, teamLimitModel))"
        />
      </div>
      <button
        @click="emit('save-team')"
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
      :advanced-cov-levels="advancedCovLevels"
    ></CovenantsPanel>

    <p
      v-if="missingCount > 0"
      class="version-hint"
    >
      当前版本「{{ currentVersion.shortLabel }}」干员池中没有 {{ missingCount }}
      名已选干员（红色虚线标记），这些干员不参与盟约层数统计
    </p>

    <VueDraggable
      v-model="teamModel"
      group="ops"
      class="drag-area team-grid"
    >
      <div
        v-for="(op, index) in team"
        :key="index"
        class="op-unit"
        :class="{ 'op-missing': isOpMissing(op) }"
        @mouseenter="hoverTraits($event, op)"
        @mousemove="moveTraitTooltip"
        @mouseleave="hideTraitTooltip"
      >
        <div class="img-container">
          <img
            :src="op.avatar"
            @error="handleImgError"
          />
          <span
            v-if="op.isSelfOperator"
            class="self-tag"
          >
            自选
          </span>
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
  import { ref, computed, toRef } from "vue";
  import { VueDraggable } from "vue-draggable-plus";
  import CovenantsPanel from "./CovenantsPanel.vue";
  import { useCovenantStats } from "@/composables/useCovenantStats.js";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import { getOperatorTraits, getOperatorCovenants } from "@/data/versions.js";
  import {
    showTraitTooltip,
    moveTraitTooltip,
    hideTraitTooltip,
  } from "@/composables/useTraitTooltip.js";
  import { handleImgError } from "@/utils/index.js";

  const props = defineProps({
    team: Array,
    teamLimit: Number,
  });

  const { currentVersion } = useGameVersion();

  const { presentCovList, presentCovCounts, activeCovList, advancedCovLevels } =
    useCovenantStats(toRef(props, "team"), currentVersion);

  /**
   * 判断干员是否不属于当前版本干员池（切换版本后可能残留其他版本的干员）
   * @param {Object} op - 编队中的干员
   * @returns {boolean} 是否为跨版本干员
   */
  const isOpMissing = (op) => {
    if (op?.isSelfOperator) {
      return false;
    }
    return !currentVersion.value.operators[op?.name];
  };

  /** 当前编队中不属于当前版本的干员数量 */
  const missingCount = computed(
    () => (props.team || []).filter((op) => isOpMissing(op)).length,
  );

  /** 悬停展示干员特质与所属盟约（跨版本干员附提示） */
  const hoverTraits = (event, op) => {
    showTraitTooltip(
      event,
      op.name,
      getOperatorTraits(op.name, currentVersion.value),
      isOpMissing(op) ? "该干员不在当前版本的干员池中，不提供盟约层数" : "",
      getOperatorCovenants(op.name, currentVersion.value),
    );
  };

  const emit = defineEmits([
    "update:team",
    "update:teamLimit",
    "save-team",
    "clear-team",
    "remove-from-team",
  ]);

  const isEffectsExpanded = ref(false);

  const teamLimitModel = computed({
    get: () => props.teamLimit,
    set: (value) => emit("update:teamLimit", value),
  });

  const teamModel = computed({
    get: () => props.team,
    set: (value) => emit("update:team", value),
  });

  const handleLimitChange = () => {
    if (props.team.length > props.teamLimit) {
      emit("update:team", props.team.slice(0, props.teamLimit));
    }
  };

  const clearTeam = () => {
    emit("clear-team");
  };

  const removeFromTeam = (index) => {
    emit("remove-from-team", index);
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
    padding: 20px;
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

  /* 跨版本干员：当前版本干员池中不存在 */
  .op-unit.op-missing img {
    outline: 2px dashed #ff6b6b;
    outline-offset: -2px;
    filter: grayscale(0.7) brightness(0.75);
  }

  .op-unit.op-missing .name-label {
    color: #ff9a9a;
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

  .self-tag {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(255, 207, 0, 0.2);
    color: rgba(255, 240, 180, 0.88);
    font-size: 9px;
    font-weight: 500;
    line-height: 1;
    padding: 2px 3px;
    border: 1px solid rgba(255, 207, 0, 0.28);
    border-radius: 3px;
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

  .version-hint {
    margin: 0;
    padding: 8px 12px;
    font-size: 12px;
    line-height: 1.5;
    color: #ffb4b4;
    background: rgba(255, 107, 107, 0.08);
    border: 1px dashed rgba(255, 107, 107, 0.4);
    border-radius: 4px;
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
