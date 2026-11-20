/**
 * 浏览器本地存储的最小封装
 *
 * 目标只有两个：
 * 1. 读失败 / 解析失败时返回调用方给的默认值，而不是把异常抛到界面
 *    （存档被手动改坏、旧格式残留都会走到这里）；
 * 2. 写失败（配额满、隐私模式禁用 localStorage）不打断当前操作。
 *
 * 这里不做数据校验与迁移——那属于各仓储（teamsRepository / preferencesRepository）
 * 的职责，本文件只处理「字符串 ⇄ 值」与异常。
 */

/** 统一带上模块前缀，便于在控制台定位是哪个键出了问题 */
const warn = (message: string, error: unknown) => {
  console.warn(`[storage] ${message}`, error);
};

/**
 * 读取并解析 JSON。缺失、损坏、无法访问都回退到 `fallback`。
 * @param key 存储键
 * @param fallback 读不到时的返回值
 */
export function readJSON<T>(key: string, fallback: T): T {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    warn(`读取「${key}」失败，已按默认值处理`, error);
    return fallback;
  }

  if (raw === null) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    warn(`「${key}」的内容不是合法 JSON，已按默认值处理`, error);
    return fallback;
  }
}

/**
 * 序列化并写入。
 * @returns 是否写入成功；调用方通常不关心，但可以据此提示用户
 */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    warn(`写入「${key}」失败（存储空间已满，或浏览器禁用了本地存储）`, error);
    return false;
  }
}

/** 读取原始文本。缺失或无法访问时返回 null */
export function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    warn(`读取「${key}」失败`, error);
    return null;
  }
}

/** 写入原始文本。@returns 是否写入成功 */
export function writeText(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    warn(`写入「${key}」失败（存储空间已满，或浏览器禁用了本地存储）`, error);
    return false;
  }
}
