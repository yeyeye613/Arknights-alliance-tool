/**
 * equipment 的公开出口
 *
 * `domain/equipRules` 只导出被跨 feature 用到的函数；纯规则的内部细节
 * 仍由 `features/equipment/domain/equipRules` 直接提供，供其它 feature 的
 * `domain/` 引用（domain 之间可以直连，避免把组件带进纯函数层）。
 */
export { default as EquipmentPicker } from "./components/EquipmentPicker.vue";
export { default as EquipmentPool } from "./components/EquipmentPool.vue";
export { default as EquipmentStaging } from "./components/EquipmentStaging.vue";
export {
  hasEquipmentDrag,
  readEquipmentDrag,
} from "./composables/useEquipmentDrag.js";
export {
  EQUIPMENT_SLOT_COUNT,
  equipToOperator,
  getOperatorEquipmentNames,
  hasEquipmentPool,
  removeOperatorEquipment,
  shouldConsumeFromStaging,
} from "./domain/equipRules";
