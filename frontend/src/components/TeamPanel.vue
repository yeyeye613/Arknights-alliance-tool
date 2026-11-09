<template>
  <section class="my-team">
    <div class="panel-header">
      <h3>当前编队 ({{ team.length }}/{{ teamLimit }})</h3>
      <div class="header-actions">
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
          清空
        </button>
      </div>
    </div>

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
    >
      <div
        v-for="(op, index) in team"
        :key="index"
        class="op-unit"
        :class="{
          'op-missing': isOpMissing(op),
          'drop-ready': dropHint,
          'drag-over': dragOverIndex === index,
        }"
        @mouseenter="hoverTraits($event, op)"
        @mousemove="moveTraitTooltip"
        @mouseleave="hideTraitTooltip"
        @dragenter.prevent="handleDragOver($event, index)"
        @dragover.prevent="handleDragOver($event, index)"
        @dragleave="handleDragLeave($event, index)"
        @drop.prevent="handleDrop($event, index)"
      >
        <div
          class="img-container"
          @click="handleOpClick(index)"
        >
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

          <!-- 装备角标：只显示已装备的槽位，点击卸下 -->
          <div
            v-if="equippedNames(op).length"
            class="equip-badges"
          >
            <span
              v-for="(equip, slot) in equippedNames(op)"
              :key="slot"
              class="equip-badge"
              :title="`${equip}（点击卸下）`"
              @click.stop="removeEquipment(index, slot)"
            >
              <img
                :src="getEquipmentIconUrl(equip)"
                :alt="equip"
                @error="handleImgError"
              />
            </span>
          </div>
        </div>
        <span class="name-label">{{ op.name }}</span>
      </div>
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
    equipToOperator,
    getOperatorEquipmentNames,
    removeOperatorEquipment,
  } from "@/data/equipment.js";
  import {
    hasEquipmentDrag,
    readEquipmentDrag,
  } from "@/composables/useEquipmentDrag.js";
  import {
    showTraitTooltip,
    moveTraitTooltip,
    hideTraitTooltip,
  } from "@/composables/useTraitTooltip.js";
  import { getEquipmentIconUrl, handleImgError } from "@/utils/index.js";

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

  const emit = defineEmits([
    "update:team",
    "update:teamLimit",
    "save-team",
    "clear-team",
    "remove-from-team",
    "notify",
    "equipment-equipped",
  ]);

  /** 已装备的装备名（最多两个，空槽不占位） */
  const equippedNames = (op) => getOperatorEquipmentNames(op);

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
    align-items: center;
    gap: 10px;
    padding: 2px 2px 0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
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
    gap: 14px 10px;
    padding: 16px;
    background: #181818;
    border: 1px solid #333;
    min-height: 100px;
    align-content: flex-start;
  }

  /* 编队一般 8~9 人：整体居中，横竖都对称，数量变化不破坏排版；
     8 人 = 8×78 + 7×10 = 694px，1366×768 下编队列内宽 ~718px 刚好一行 */
  .team-grid {
    border: 2px dashed #444;
    justify-content: center;
    align-content: center;
    min-height: 232px;
    max-height: none;
  }

  .op-unit {
    position: relative;
    width: 78px;
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

  .equip-badges {
    position: absolute;
    left: 3px;
    bottom: 3px;
    display: flex;
    gap: 2px;
    pointer-events: none;
  }

  .equip-badge {
    position: relative;
    width: 20px;
    height: 20px;
    padding: 1px;
    box-sizing: border-box;
    background: rgba(10, 10, 10, 0.85);
    border: 1px solid #4c6b3f;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }

  .equip-badge img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 2px;
    background: #111;
  }

  .equip-badge:hover {
    border-color: #ff4d4f;
    transform: translateY(-1px);
  }

  .equip-badge:hover::after {
    content: "×";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 0, 0, 0.6);
    color: #ff8a8a;
    font-size: 13px;
    font-weight: bold;
    line-height: 1;
    border-radius: 3px;
  }

  /* 临时装备池有货时，头像提示可放置 */
  .op-unit.drop-ready .img-container img {
    outline: 1px dashed rgba(143, 224, 205, 0.65);
    outline-offset: -1px;
  }

  .op-unit.drag-over .img-container img {
    outline: 2px solid #8fe0cd;
    outline-offset: -2px;
    box-shadow: 0 0 10px rgba(143, 224, 205, 0.45);
  }

  .op-unit.drag-over .name-label {
    color: #8fe0cd;
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

    .equip-badge {
      width: 22px;
      height: 22px;
    }

    .equip-badges {
      left: 2px;
      bottom: 2px;
      gap: 3px;
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
