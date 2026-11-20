/**
 * 分享码错误契约
 *
 * 领域层只回答「失败在哪一步」，**不产出用户可见文案**：
 * 文案由 `@/features/sharing/messages` 按 code 映射。
 *
 * code 与改前的一条既有文案一一对应，不做「原因粗分类」的合并——
 * 合两个 code 就会改变用户在某个边界输入下看到的话。
 * 例如「内容为空」与「密语不能为空」语义相近，但触发条件不同
 * （前者是码里只有前缀与零值，后者是输入框为空），合并即 UX 变化。
 */

/** 全部错误码（数组是运行时唯一来源，类型由它派生） */
export const SHARE_ERROR_CODES = [
  /** 输入为空 */
  "EMPTY",
  /** 码里只有前缀与零值字节 */
  "EMPTY_PAYLOAD",
  /** Base62 串含非法字符 */
  "BAD_CHAR",
  /** 字节流被截断 */
  "INCOMPLETE",
  /** varint 溢出或解压失败 */
  "DATA_CORRUPT",
  /** 紧凑码 magic 不匹配 */
  "BAD_FORMAT",
  /** 类型字节不认识 */
  "UNSUPPORTED_TYPE",
  /** 码来自更新的版本 */
  "VERSION_TOO_NEW",
  /** 历史码无法识别 */
  "LEGACY_FORMAT",
  /** 历史码 base64 / inflate 失败 */
  "LEGACY_CORRUPT",
  /** 历史码版本号不支持 */
  "LEGACY_VERSION",
  /** 导入后编队为空 */
  "NO_OPERATOR",
  /** 导入后合集为空 */
  "NO_COLLECTION",
] as const;

export type ShareErrorCode = (typeof SHARE_ERROR_CODES)[number];

/**
 * 带错误码的领域异常
 *
 * `message` 与 code 相同，仅用于日志与堆栈定位；**不要把它当文案用**，
 * 视图层一律走 `shareMessageOf()` 取文案。
 */
export class ShareError extends Error {
  readonly code: ShareErrorCode;

  constructor(code: ShareErrorCode) {
    super(code);
    this.name = "ShareError";
    this.code = code;
  }
}
