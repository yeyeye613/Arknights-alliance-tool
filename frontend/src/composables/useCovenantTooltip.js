/**
 * 盟约效果悬停提示的全局单例状态
 *
 * 与特质提示相互独立：悬停「盟约图标 / 名称 / 编队盟约栏」时展示该盟约的
 * 激活门槛与全部效果，避免用户为了看效果去翻 PRTS。
 */
import { reactive } from "vue";

const state = reactive({
  visible: false,
  x: 0,
  y: 0,
  name: "",
  /** 当前编队中的同名干员数量，null 表示该入口不提供编队信息 */
  presentCount: null,
  /** 当前编队中该盟约的进阶等级（0 表示未进阶） */
  advanced: 0,
});

const TOOLTIP_WIDTH = 300;
const EDGE_MARGIN = 8;

/** 触屏设备没有 mouseleave，提示改为自动消失 */
const TOUCH_HIDE_DELAY = 2600;

let autoHideTimer = null;

/** 是否为触摸 / 无悬停能力的设备 */
export function isCoarsePointer() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: none)").matches;
}

function clearAutoHide() {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
}

/** 计算提示框位置，贴边时向内收拢 */
function updatePosition(event) {
  let x = event.clientX + 14;
  let y = event.clientY + 14;

  const maxX = window.innerWidth - TOOLTIP_WIDTH - EDGE_MARGIN;
  if (x > maxX) {
    x = event.clientX - TOOLTIP_WIDTH - 14;
  }
  const maxY = window.innerHeight - EDGE_MARGIN - 200;
  if (y > maxY) {
    y = event.clientY - 200;
  }
  state.x = Math.max(EDGE_MARGIN, x);
  state.y = Math.max(EDGE_MARGIN, y);
}

/**
 * 显示盟约效果提示
 * @param {MouseEvent} event - 鼠标事件
 * @param {string} name - 盟约名
 * @param {Object} [extra] - 附加信息
 * @param {number|null} [extra.presentCount] - 当前编队中的同名干员数量
 * @param {number} [extra.advanced] - 当前进阶等级
 */
export function showCovenantTooltip(event, name, extra = {}) {
  if (!name) {
    return;
  }
  state.name = name;
  state.presentCount =
    typeof extra.presentCount === "number" ? extra.presentCount : null;
  state.advanced = extra.advanced || 0;
  state.visible = true;
  updatePosition(event);

  clearAutoHide();
  if (isCoarsePointer()) {
    autoHideTimer = setTimeout(() => {
      state.visible = false;
      autoHideTimer = null;
    }, TOUCH_HIDE_DELAY);
  }
}

/** 跟随鼠标移动 */
export function moveCovenantTooltip(event) {
  if (state.visible) {
    updatePosition(event);
  }
}

/** 隐藏提示 */
export function hideCovenantTooltip() {
  clearAutoHide();
  state.visible = false;
}

/** 供组件读取的响应式状态 */
export function useCovenantTooltipState() {
  return state;
}
