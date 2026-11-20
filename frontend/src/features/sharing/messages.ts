/**
 * 分享码的用户文案（视图层）
 *
 * 领域层抛 `ShareError(code)`，文案在这里按 code 映射。
 * 这样改措辞不用碰领域层，领域层也不会因为一句提示而反向依赖界面。
 *
 * 放在 feature 根目录而不是 `components/`：`useShareCode`（composable）
 * 与 `ImportDialog`（component）都要用它，放任一子目录都会形成
 * 「composable 依赖 component」这种倒挂。
 */
import type { ShareErrorCode } from "@/features/sharing/domain/shareErrors";

/** code → 文案；`Record` 由类型保证每个 code 都有条目 */
export const SHARE_ERROR_MESSAGES: Record<ShareErrorCode, string> = {
  EMPTY: "密语不能为空",
  EMPTY_PAYLOAD: "分享码内容为空",
  BAD_CHAR: "分享码包含非法字符",
  INCOMPLETE: "分享码数据不完整",
  DATA_CORRUPT: "分享码数据损坏",
  BAD_FORMAT: "无效的分享码格式",
  UNSUPPORTED_TYPE: "不支持的分享码类型",
  VERSION_TOO_NEW: "分享码来自更新的版本，请刷新页面后再导入",
  LEGACY_FORMAT: "无效的密语格式",
  LEGACY_CORRUPT: "分享码已损坏，请重新复制完整内容",
  LEGACY_VERSION: "不支持的密语版本",
  NO_OPERATOR: "编队中没有有效干员",
  NO_COLLECTION: "合集中没有有效编队",
};

/**
 * 从任意异常里取出用户文案
 * @param error 捕获到的异常（可能是 ShareError，也可能是别的）
 * @param fallback 拿不到 code 时用的话术，由调用方决定
 */
export function shareMessageOf(error: unknown, fallback: string): string {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  if (typeof code === "string" && code in SHARE_ERROR_MESSAGES) {
    return SHARE_ERROR_MESSAGES[code as ShareErrorCode];
  }
  return fallback;
}
