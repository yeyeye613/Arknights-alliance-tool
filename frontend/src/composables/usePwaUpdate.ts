import { ref } from "vue";

/**
 * Service Worker 的注册与更新提示
 *
 * GitHub Pages 无法自定义 Cache-Control，缓存只能放在客户端：
 * 这里用 Workbox（vite-plugin-pwa）预缓存应用外壳、运行时缓存头像，
 * 并通过 prompt 模式提示新版本，避免直接刷新打断正在编辑的编队。
 */
export const updateAvailable = ref(false);

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

let updateServiceWorker: UpdateServiceWorker | null = null;
let initialized = false;

/** 注册 Service Worker（仅生产构建；dev 下不启用，避免缓存干扰热更新） */
export async function initServiceWorker(): Promise<void> {
  if (initialized || import.meta.env.DEV) {
    return;
  }
  initialized = true;

  try {
    const { registerSW } = await import("virtual:pwa-register");
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateAvailable.value = true;
      },
      onRegisterError(error: unknown) {
        console.warn("[pwa] Service Worker 注册失败", error);
      },
    });
  } catch (error) {
    // 浏览器不支持 SW 或被隐私模式禁用时，退化为普通静态站点
    console.warn("[pwa] 当前环境无法注册 Service Worker", error);
  }
}

/** 激活新版本并刷新页面 */
export function applyUpdate(): void {
  if (updateServiceWorker) {
    void updateServiceWorker(true);
    return;
  }
  window.location.reload();
}

/** 本次先不更新，继续使用当前缓存版本 */
export function dismissUpdate(): void {
  updateAvailable.value = false;
}
