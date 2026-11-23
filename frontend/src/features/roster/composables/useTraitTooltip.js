import { createTooltip } from "@/shared/composables/useTooltip.js";

/**
 * 特质悬停提示的全局单例状态
 *
 * 供 TraitTooltip.vue 渲染，各干员卡片调用 show / move / hide。
 * 定位与触屏自动隐藏等公共逻辑在 `useTooltip.js`，这里只描述「特质浮层装什么」。
 */
const tooltip = createTooltip({
  width: 280,
  height: 160,
  initialState: () => ({
    name: "",
    covenants: [],
    traits: [],
    note: "",
  }),
});

/**
 * 显示特质提示
 * @param {MouseEvent} event - 鼠标事件
 * @param {string} name - 干员名
 * @param {Array} traits - 特质列表
 * @param {string} [note] - 附加说明（如跨版本提示）
 * @param {Array<string>} [covenants] - 干员所属盟约
 * @param {boolean} [sticky] - 为真时不自动消失（点击触发的详情，由调用方关闭）
 */
export function showTraitTooltip(
  event,
  name,
  traits,
  note = "",
  covenants = [],
  sticky = false,
) {
  tooltip.show(
    event,
    {
      name,
      traits: Array.isArray(traits) ? traits : [],
      covenants: Array.isArray(covenants) ? covenants : [],
      note,
    },
    { sticky },
  );
}

/** 跟随鼠标移动 */
export function moveTraitTooltip(event) {
  tooltip.move(event);
}

/** 隐藏提示 */
export function hideTraitTooltip() {
  tooltip.hide();
}

/** 供组件读取的只读状态 */
export function useTraitTooltipState() {
  return tooltip.state;
}
