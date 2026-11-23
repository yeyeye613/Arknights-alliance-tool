<template>
  <section class="my-team">
    <TeamHeader
      :count="team.length"
      :limit="teamLimit"
      @update:limit="emit('update:teamLimit', $event)"
      @limit-change="handleLimitChange"
      @save="emit('save-team')"
      @clear="clearTeam"
    />

    <CovenantsPanel
      :presentCovList="presentCovList"
      :presentCovCounts="presentCovCounts"
      :advanced-cov-levels="advancedCovLevels"
      :morph-cov-counts="morphCovCounts"
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
      :delay="200"
      :delay-on-touch-only="true"
      :touch-start-threshold="10"
      :fallback-tolerance="8"
    >
      <OperatorSlot
        v-for="(op, index) in team"
        :key="index"
        :op="op"
        :missing="isOpMissing(op)"
        :drop-ready="dropHint"
        :drag-over="dragOverIndex === index"
        @pick="handleOpClick(index)"
        @remove="removeFromTeam(index)"
        @remove-equipment="removeEquipment(index, $event)"
        @hover="hoverTraits($event, op)"
        @move="moveTraitTooltip"
        @leave="hideTraitTooltip"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave($event, index)"
        @drop="handleDrop($event, index)"
      />
    </VueDraggable>

    <!-- 临时装备池：贴在编队干员正下方，由父组件提供内容 -->
    <slot name="staging" />

    <EquipmentPicker
      v-if="equipOperator"
      :show="equipTarget !== null"
      :operator-name="equipOperator.name"
      :equipments="equipOperator.equipments || []"
      :initial-slot="equipSlot"
      @update:equipments="updateEquipments"
      @close="closeEquipmentPicker"
    />

    <ActiveEffectsList :active-cov-list="activeCovList" />
  </section>
</template>

<script setup>
  import { computed, ref, toRef } from "vue";
  import { VueDraggable } from "vue-draggable-plus";
  import { CovenantsPanel, useCovenantStats } from "@/features/covenants";
  import {
    EQUIPMENT_SLOT_COUNT,
    EquipmentPicker,
    equipToOperator,
    getOperatorEquipmentNames,
    hasEquipmentDrag,
    hasEquipmentPool,
    readEquipmentDrag,
    removeOperatorEquipment,
  } from "@/features/equipment";
  import TeamHeader from "@/features/formation/components/TeamHeader.vue";
  import OperatorSlot from "@/features/formation/components/OperatorSlot.vue";
  import ActiveEffectsList from "@/features/formation/components/ActiveEffectsList.vue";
  import { useGameVersion } from "@/features/game-version";
  import {
    getEffectiveOperatorCovenants,
    getOperatorTraits,
  } from "@/data/versions.js";
  import {
    countMissingOperators,
    exceedsTeamLimit,
    isOperatorMissing,
    truncateToLimit,
  } from "@/features/formation/domain/teamRules";
  import {
    hideTraitTooltip,
    moveTraitTooltip,
    showTraitTooltip,
  } from "@/features/roster";

  const props = defineProps({
    team: Array,
    teamLimit: Number,
    /** 临时装备池里有装备时，头像显示可放置提示 */
    dropHint: Boolean,
    /** 已选中的装备（点选装备后再点干员即可装备） */
    selectedEquipment: { type: String, default: "" },
  });

  const { currentVersion } = useGameVersion();

  const {
    presentCovList,
    presentCovCounts,
    activeCovList,
    advancedCovLevels,
    morphCovCounts,
  } = useCovenantStats(toRef(props, "team"), currentVersion);

  /**
   * 判断干员是否不属于当前版本干员池（切换版本后可能残留其他版本的干员）
   * @param {Object} op - 编队中的干员
   * @returns {boolean} 是否为跨版本干员
   */
  const isOpMissing = (op) => isOperatorMissing(op, currentVersion.value);

  /** 当前编队中不属于当前版本的干员数量 */
  const missingCount = computed(() =>
    countMissingOperators(props.team, currentVersion.value),
  );

  /** 悬停展示干员特质与所属盟约（跨版本干员附提示） */
  const hoverTraits = (event, op) => {
    // 已选中装备时，点头像是在说「装给它」，不要用详情浮层挡在前面
    if (props.selectedEquipment) return;
    showTraitTooltip(
      event,
      op.name,
      getOperatorTraits(op.name, currentVersion.value),
      isOpMissing(op) ? "该干员不在当前版本的干员池中，不提供盟约层数" : "",
      getEffectiveOperatorCovenants(op, currentVersion.value),
    );
  };

  /** 当前版本是否有装备数据 */
  const hasEquipments = computed(() =>
    hasEquipmentPool(currentVersion.value),
  );

  const emit = defineEmits([
    "update:team",
    "update:teamLimit",
    "save-team",
    "clear-team",
    "remove-from-team",
    "notify",
    "equipment-equipped",
  ]);

  /** 装备选择器：目标干员下标与当前槽位 */
  const equipTarget = ref(null);
  const equipSlot = ref(0);

  const equipOperator = computed(() =>
    equipTarget.value === null ? null : props.team?.[equipTarget.value],
  );

  const openEquipmentPicker = (index, slot) => {
    if (!hasEquipments.value) return;
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

  /* ------------------------------ 装备拖拽 / 点选 ------------------------------ */

  /** 当前拖拽悬停的干员下标，仅用于高亮 */
  const dragOverIndex = ref(null);

  const handleDragOver = (event, index) => {
    // 只有装备拖拽才显示放置高亮；干员排序拖拽交给 Sortable 自己处理
    if (!hasEquipmentDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    dragOverIndex.value = index;
  };

  const handleDragLeave = (event, index) => {
    // 在头像内部移动（进入 img / 角标）也会触发 dragleave，忽略这种情况
    const related = event?.relatedTarget;
    if (related && event.currentTarget?.contains?.(related)) return;
    if (dragOverIndex.value === index) {
      dragOverIndex.value = null;
    }
  };

  /** 把装备装到指定干员身上，失败时给出具体原因 */
  const applyEquipment = (index, name, source = "pool") => {
    const op = props.team?.[index];
    if (!op || !name) return;

    const result = equipToOperator(op, name);
    if (!result.ok) {
      const message =
        result.reason === "duplicated"
          ? `${op.name} 已经装备了「${name}」`
          : `${op.name} 的装备槽已满（${EQUIPMENT_SLOT_COUNT} 件），点击头像左下角标可卸下`;
      emit("notify", message);
      return;
    }

    emit(
      "update:team",
      props.team.map((item, i) =>
        i === index ? { ...item, equipments: result.equipments } : item,
      ),
    );
    emit("equipment-equipped", {
      name,
      source,
      operatorName: op.name,
    });
    emit("notify", `已为 ${op.name} 装备「${name}」`);
  };

  const handleDrop = (event, index) => {
    dragOverIndex.value = null;
    const payload = readEquipmentDrag(event);
    if (!payload) return;
    applyEquipment(index, payload.name, payload.from);
  };

  /** 点击头像：有选中装备时直接装上，否则打开装备选择器 */
  const handleOpClick = (index) => {
    if (props.selectedEquipment) {
      applyEquipment(index, props.selectedEquipment, "staging");
      return;
    }
    openEquipmentPicker(index, 0);
  };

  /** 点击角标卸下对应装备 */
  const removeEquipment = (index, slot) => {
    const op = props.team?.[index];
    if (!op) return;
    const name = getOperatorEquipmentNames(op)[slot];
    if (!name) return;

    emit(
      "update:team",
      props.team.map((item, i) =>
        i === index
          ? { ...item, equipments: removeOperatorEquipment(item, slot) }
          : item,
      ),
    );
    emit("notify", `已卸下「${name}」`);
  };

  const teamModel = computed({
    get: () => props.team,
    set: (value) => emit("update:team", value),
  });

  const handleLimitChange = () => {
    if (exceedsTeamLimit(props.team, props.teamLimit)) {
      emit("update:team", truncateToLimit(props.team, props.teamLimit));
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

  .drag-area {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 10px;
    padding: 16px;
    background: #181818;
    border: 1px solid #333;
    min-height: 100px;
    align-content: flex-start;
  }

  /* 编队一般 8~9 人：整体居中，横竖都对称，数量变化不破坏排版；
     8 人 = 8×75 + 7×10 = 670px，1366×768 下编队列内宽 ~718px 刚好一行 */
  .team-grid {
    border: 2px dashed #444;
    justify-content: center;
    align-content: center;
    min-height: 232px;
    max-height: none;
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

  @media (max-width: 768px) {
    .my-team {
      gap: 10px;
    }

    .drag-area {
      gap: 12px 10px;
      padding: 12px;
      max-height: none;
      min-height: 96px;
    }

    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      align-content: flex-start;
    }

    .team-grid .op-unit {
      width: auto;
    }

    .version-hint {
      font-size: 11px;
      padding: 7px 10px;
    }
  }
</style>
