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
        <div
          v-if="hasEquipments"
          class="equip-slots"
        >
          <button
            v-for="(equip, slot) in displayEquipments(op)"
            :key="slot"
            class="equip-slot"
            :class="{ filled: Boolean(equip) }"
            :title="equip ? `${equip}（点击更换）` : `槽位 ${slot + 1}：未装备`"
            @click.stop="openEquipmentPicker(index, slot)"
          >
            {{ equip || "＋" }}
          </button>
        </div>
      </div>
    </VueDraggable>

    <EquipmentPicker
      v-if="equipOperator"
      :show="equipTarget !== null"
      :operator-name="equipOperator.name"
      :equipments="equipOperator.equipments || []"
      :initial-slot="equipSlot"
      @update:equipments="updateEquipments"
      @close="closeEquipmentPicker"
    />

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
  import EquipmentPicker from "./EquipmentPicker.vue";
  import { useCovenantStats } from "@/composables/useCovenantStats.js";
  import { useGameVersion } from "@/composables/useGameVersion.js";
  import {
    getEffectiveOperatorCovenants,
    getOperatorTraits,
  } from "@/data/versions.js";
  import {
    EQUIPMENT_SLOT_COUNT,
    getOperatorEquipmentNames,
  } from "@/data/equipment.js";
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
      getEffectiveOperatorCovenants(op, currentVersion.value),
    );
  };

  /** 当前版本是否有装备数据 */
  const hasEquipments = computed(
    () => Object.keys(currentVersion.value.equipments || {}).length > 0,
  );

  /** 装备选择器：目标干员下标与当前槽位 */
  const equipTarget = ref(null);
  const equipSlot = ref(0);

  const equipOperator = computed(() =>
    equipTarget.value === null ? null : props.team?.[equipTarget.value],
  );

  /** 展示用装备槽：不足两个时补空槽 */
  const displayEquipments = (op) => {
    const names = getOperatorEquipmentNames(op);
    while (names.length < EQUIPMENT_SLOT_COUNT) names.push("");
    return names;
  };

  const openEquipmentPicker = (index, slot) => {
    equipTarget.value = index;
    equipSlot.value = slot;
    hideTraitTooltip();
  };

  const closeEquipmentPicker = () => {
    equipTarget.value = null;
  };

  /** 更新某个干员的装备（写回整个编队由父组件处理） */
  const updateEquipments = (names) => {
    const index = equipTarget.value;
    if (index === null) return;
    emit(
      "update:team",
      props.team.map((op, i) => (i === index ? { ...op, equipments: names } : op)),
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

  .equip-slots {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 3px;
  }

  .equip-slot {
    width: 100%;
    padding: 1px 3px;
    font-size: 9px;
    line-height: 1.4;
    color: #666;
    background: #1f1f1f;
    border: 1px dashed #3d3d3d;
    border-radius: 3px;
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: 0.15s;
  }

  .equip-slot.filled {
    color: #d3e2c8;
    background: #22301f;
    border-style: solid;
    border-color: #4c6b3f;
  }

  .equip-slot:hover {
    border-color: #ffcf00;
    color: #ffcf00;
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

  @media (max-width: 768px) {
    .my-team {
      gap: 8px;
    }

    .panel-header {
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 4px 0 10px;
    }

    .panel-header h3 {
      font-size: 15px;
    }

    .limit-setter {
      order: 3;
      margin-left: auto;
      font-size: 12px;
    }

    .new-team-btn,
    .clear-btn {
      padding: 8px 12px;
      font-size: 13px;
    }

    .clear-btn {
      padding: 8px 10px;
    }

    .drag-area {
      gap: 10px 8px;
      padding: 10px;
      max-height: none;
      min-height: 84px;
    }

    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      align-content: flex-start;
    }

    .team-grid .op-unit {
      width: auto;
    }

    .name-label {
      font-size: 11px;
      margin-top: 4px;
    }

    .remove-btn {
      width: 22px;
      height: 22px;
      top: -8px;
      right: -8px;
      font-size: 14px;
      line-height: 1;
    }

    .collapse-header {
      padding: 10px 12px;
      font-size: 13px;
    }

    .collapse-content {
      padding: 12px;
      max-height: 45vh;
    }

    .collapse-content p {
      font-size: 12px;
    }

    .version-hint {
      font-size: 11px;
      padding: 7px 10px;
    }
  }
</style>
