/**
 * 错误码与文案的对应关系
 *
 * 领域层的 `ShareError` 只带 code，界面靠 `shareMessageOf` 取文案。
 * 这条测试防的是「新加了一个 code 却忘了写文案」——类型能保证 `Record`
 * 完整，但 code 数组与文案表是两份运行时数据，仍可能漂移。
 */
import { describe, it, expect } from "vitest";

import {
  SHARE_ERROR_CODES,
  ShareError,
} from "@/features/sharing/domain/shareErrors";
import {
  SHARE_ERROR_MESSAGES,
  shareMessageOf,
} from "@/features/sharing/messages";

describe("分享码错误文案", () => {
  it("每个错误码都有非空文案", () => {
    for (const code of SHARE_ERROR_CODES) {
      expect(SHARE_ERROR_MESSAGES[code], code).toBeTruthy();
      expect(SHARE_ERROR_MESSAGES[code].length, code).toBeGreaterThan(0);
    }
  });

  it("文案表与错误码列表一一对应（无多余、无遗漏）", () => {
    expect(Object.keys(SHARE_ERROR_MESSAGES).sort()).toEqual(
      [...SHARE_ERROR_CODES].sort(),
    );
  });

  it("从 ShareError 取出对应文案", () => {
    expect(shareMessageOf(new ShareError("EMPTY"), "兜底")).toBe(
      "密语不能为空",
    );
    expect(shareMessageOf(new ShareError("NO_OPERATOR"), "兜底")).toBe(
      "编队中没有有效干员",
    );
  });

  it("非领域异常或没有 code 时用调用方兜底", () => {
    expect(shareMessageOf(new TypeError("boom"), "兜底")).toBe("兜底");
    expect(shareMessageOf(undefined, "兜底")).toBe("兜底");
    expect(shareMessageOf({ code: "NOT_A_CODE" }, "兜底")).toBe("兜底");
  });
});
