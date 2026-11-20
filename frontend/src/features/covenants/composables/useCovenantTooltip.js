/**
 * 盟约效果悬停提示的全局单例状态
 *
 * 与特质提示相互独立：悬停「盟约图标 / 名称 / 编队盟约栏」时展示该盟约的
 * 激活门槛与全部效果，避免用户为了看效果去翻 PRTS。
 *
 * 定位、贴边收拢、触屏自动消失等公共逻辑在 `useTooltip.js`。
 */
import { createTooltip } from "@/shared/composables/useTooltip.js";

export { isCoarsePointer } from "@/shared/composables/useTooltip.js";

const tooltip = createTooltip({
  width: 300,
  height: 200,
  initialState: () => ({
    name: "",
    /** 当前编队中的同名干员数量，null 表示该入口不提供编队信息 */
    presentCount: null,
    /** 当前编队中该盟约的进阶等级（0 表示未进阶） */
    advanced: 0,
    /** 当前编队中由「变形同构体」贡献的人数 */
    morphCount: 0,
  }),
});

/**
 * 显示盟约效果提示
 * @param {MouseEvent} event - 鼠标事件
 * @param {string} name - 盟约名
 * @param {Object} [extra] - 附加信息
 * @param {number|null} [extra.presentCount] - 当前编队中的同名干员数量
 * @param {number} [extra.advanced] - 当前进阶等级
 * @param {number} [extra.morphCount] - 其中由变形同构体贡献的人数
 */
export function showCovenantTooltip(event, name, extra = {}) {
  if (!name) {
    return;
  }
  tooltip.show(event, {
    name,
    presentCount:
      typeof extra.presentCount === "number" ? extra.presentCount : null,
    advanced: extra.advanced || 0,
    morphCount: extra.morphCount || 0,
  });
}

/** 跟随鼠标移动 */
export function moveCovenantTooltip(event) {
  tooltip.move(event);
}

/** 隐藏提示 */
export function hideCovenantTooltip() {
  tooltip.hide();
}

/** 供组件读取的响应式状态 */
export function useCovenantTooltipState() {
  return tooltip.state;
}
