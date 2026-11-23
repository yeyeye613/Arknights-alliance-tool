import { vi } from "vitest";
import { NARROW_QUERY } from "@/shared/composables/useNarrowViewport.js";
import { FINE_POINTER_QUERY } from "@/shared/composables/useFinePointer.js";

/**
 * 可控的 matchMedia 桩，同时服务两个判定：
 * - 单列（布局）→ NARROW_QUERY
 * - 有鼠标（交互）→ FINE_POINTER_QUERY
 *
 * 桩按查询串返回各自的 matches，未登记的查询一律 false。
 * 不忽略入参——写死返回值会让「断点或查询串改坏」也测不出来。
 *
 * @param {{ narrow?: boolean, fine?: boolean }} initial 初始命中情况
 */
export function stubMediaQueries({ narrow = false, fine = false } = {}) {
  const values = new Map([
    [NARROW_QUERY, narrow],
    [FINE_POINTER_QUERY, fine],
  ]);
  const handlers = new Map();
  const stubs = new Map();

  const stubFor = (query) => {
    if (!stubs.has(query)) {
      stubs.set(query, {
        media: query,
        get matches() {
          return values.get(query) ?? false;
        },
        addEventListener(type, handler) {
          if (type !== "change") return;
          if (!handlers.has(query)) handlers.set(query, new Set());
          handlers.get(query).add(handler);
        },
        removeEventListener(type, handler) {
          if (type !== "change") return;
          handlers.get(query)?.delete(handler);
        },
      });
    }
    return stubs.get(query);
  };

  const set = (query, next) => {
    values.set(query, next);
    handlers.get(query)?.forEach((handler) => handler({ matches: next }));
  };

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query) => stubFor(query)),
  );

  return {
    /** 模拟视口跨断点 */
    setNarrow: (next) => set(NARROW_QUERY, next),
    /** 模拟插拔鼠标（或外接触控板） */
    setFinePointer: (next) => set(FINE_POINTER_QUERY, next),
  };
}
