import { onMounted, onUnmounted, ref } from "vue";

/**
 * 精确指针（鼠标 / 触控笔 / 带触控板的平板）的判定查询。
 *
 * 与 `useNarrowViewport` 回答的是两件事：那边问「布局是不是单列」，
 * 这边问「用户能不能稳稳地拖」。触屏哪怕排成两列也拖不准，
 * 长按拖拽还会抢走页面滚动，所以交互方式只看指针，不看宽度。
 */
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * 当前设备是否有可用鼠标指针
 *
 * 命中时可以用拖拽；否则一律走点选（单击看详情、双击入队）。
 * 混合设备（触屏笔记本）以主指针为准，接了鼠标就按桌面处理。
 *
 * @param {string} [query] 查询串，默认取 FINE_POINTER_QUERY
 */
export function useFinePointer(query = FINE_POINTER_QUERY) {
  // 默认按「有鼠标」：量不到媒体查询的环境（老浏览器、jsdom）几乎都是桌面，
  // 猜错也只是多点一下；反过来默认触屏会让桌面用户单击失效
  const hasFinePointer = ref(true);
  let mediaQuery = null;

  const sync = (event) => {
    hasFinePointer.value = event.matches;
  };

  onMounted(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    mediaQuery = window.matchMedia(query);
    hasFinePointer.value = mediaQuery.matches;
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
    } else {
      mediaQuery.addListener?.(sync);
    }
  });

  onUnmounted(() => {
    if (!mediaQuery) return;
    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", sync);
    } else {
      mediaQuery.removeListener?.(sync);
    }
    mediaQuery = null;
  });

  return { hasFinePointer };
}
