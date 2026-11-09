import { reactive } from "vue";

/**
 * 特质悬停提示的全局单例状态
 * 供 TraitTooltip.vue 渲染，各干员卡片调用 show / move / hide
 */
const state = reactive({
  visible: false,
  x: 0,
  y: 0,
  name: "",
  covenants: [],
  traits: [],
  note: "",
});

const TOOLTIP_WIDTH = 280;
const EDGE_MARGIN = 8;
/** 触屏设备没有 mouseleave，提示改为自动消失 */
const TOUCH_HIDE_DELAY = 2600;

let autoHideTimer = null;

/** 是否为触摸 / 无悬停能力的设备 */
function isCoarsePointer() {
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
  const maxY = window.innerHeight - EDGE_MARGIN - 160;
  if (y > maxY) {
    y = event.clientY - 160;
  }
  state.x = Math.max(EDGE_MARGIN, x);
  state.y = Math.max(EDGE_MARGIN, y);
}

/**
 * 显示特质提示
 * @param {MouseEvent} event - 鼠标事件
 * @param {string} name - 干员名
 * @param {Array} traits - 特质列表
 * @param {string} [note] - 附加说明（如跨版本提示）
 * @param {Array<string>} [covenants] - 干员所属盟约
 */
export function showTraitTooltip(
  event,
  name,
  traits,
  note = "",
  covenants = [],
) {
  state.name = name;
  state.traits = Array.isArray(traits) ? traits : [];
  state.covenants = Array.isArray(covenants) ? covenants : [];
  state.note = note;
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
export function moveTraitTooltip(event) {
  if (state.visible) {
    updatePosition(event);
  }
}

/** 隐藏提示 */
export function hideTraitTooltip() {
  clearAutoHide();
  state.visible = false;
}

/** 供组件读取的只读状态 */
export function useTraitTooltipState() {
  return state;
}
