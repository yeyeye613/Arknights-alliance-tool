import { reactive } from "vue";

/**
 * 悬停浮层控制器工厂
 *
 * 特质提示与盟约提示此前是两个近乎逐行相同的 composable（定位、贴边收拢、
 * 触屏自动消失各写一遍，只差浮层宽高与自有字段）。这里只抽公共部分，
 * 两个浮层的**内容与组件仍是各自独立的**——它们的模板差别很大。
 */

/** 浮层与视口边缘的最小间距 */
const EDGE_MARGIN = 8;

/** 鼠标与浮层的偏移 */
const CURSOR_OFFSET = 14;

/** 触屏设备没有 mouseleave，提示改为自动消失 */
export const TOUCH_HIDE_DELAY = 2600;

/** 是否为触摸 / 无悬停能力的设备 */
export function isCoarsePointer() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: none)").matches;
}

/**
 * 创建一个悬停浮层控制器
 *
 * @param {Object} options
 * @param {number} options.width 浮层宽度，用于判断右侧是否放得下
 * @param {number} options.height 浮层高度，用于判断下方是否放得下
 * @param {() => Object} options.initialState 浮层自有字段的初值
 */
export function createTooltip({ width, height, initialState }) {
  const state = reactive({ visible: false, x: 0, y: 0, ...initialState() });
  let autoHideTimer = null;

  const clearAutoHide = () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }
  };

  /** 计算提示框位置，贴边时向内收拢 */
  const updatePosition = (event) => {
    let x = event.clientX + CURSOR_OFFSET;
    let y = event.clientY + CURSOR_OFFSET;

    const maxX = window.innerWidth - width - EDGE_MARGIN;
    if (x > maxX) {
      x = event.clientX - width - CURSOR_OFFSET;
    }
    const maxY = window.innerHeight - EDGE_MARGIN - height;
    if (y > maxY) {
      y = event.clientY - height;
    }
    state.x = Math.max(EDGE_MARGIN, x);
    state.y = Math.max(EDGE_MARGIN, y);
  };

  /** 触屏上开始计时自动隐藏；鼠标设备不处理（靠 mouseleave） */
  const scheduleAutoHide = () => {
    clearAutoHide();
    if (!isCoarsePointer()) {
      return;
    }
    autoHideTimer = setTimeout(() => {
      state.visible = false;
      autoHideTimer = null;
    }, TOUCH_HIDE_DELAY);
  };

  return {
    state,

    /**
     * 显示浮层并写入内容
     * @param {MouseEvent} event 触发事件，用其坐标定位
     * @param {Object} patch 本次要写入的自有字段
     */
    show(event, patch) {
      Object.assign(state, patch, { visible: true });
      updatePosition(event);
      scheduleAutoHide();
    },

    /** 跟随鼠标移动 */
    move(event) {
      if (state.visible) {
        updatePosition(event);
      }
    },

    /** 隐藏浮层（并取消自动隐藏计时） */
    hide() {
      clearAutoHide();
      state.visible = false;
    },
  };
}
