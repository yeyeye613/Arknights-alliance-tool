import { onMounted, onUnmounted, ref } from "vue";

/**
 * 单列堆叠断点，与样式里的媒体查询保持一致。
 *
 * 改这里必须同时改：PoolPanel / TeamPanel / SavedTeamsPanel 的 `@media`、
 * app/App.vue 的 `.container` 布局。
 */
export const NARROW_QUERY = "(max-width: 1024px)";

/**
 * 当前是否为单列（窄屏）布局
 *
 * 只回答「是不是单列」，不负责布局本身——排版仍由 CSS 媒体查询决定。
 * 需要它的地方有两类：折叠开关这类只在单列出现的控件，以及
 * 「拖拽还是点选」这类交互分叉。两处以上共用一个答案，避免各写一份 query。
 *
 * @param {string} [query] 断点查询串，默认取 NARROW_QUERY
 */
export function useNarrowViewport(query = NARROW_QUERY) {
  const isNarrow = ref(false);
  let mediaQuery = null;

  const sync = (event) => {
    isNarrow.value = event.matches;
  };

  onMounted(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    mediaQuery = window.matchMedia(query);
    isNarrow.value = mediaQuery.matches;
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

  return { isNarrow };
}
