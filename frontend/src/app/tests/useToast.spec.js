/**
 * 顶部临时提示
 *
 * 重点验证两件容易悄悄坏掉的事：
 * 1. 连续提示时，前一条的计时器不能把后一条提前清掉；
 * 2. 作用域销毁后计时器要释放，不能继续写一个已经没人看的状态。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { effectScope } from "vue";

import { useToast } from "@/app/useToast.js";

describe("useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("显示提示并在 2 秒后自动清空", () => {
    const { tempMessage, showTempMessage } = useToast();

    showTempMessage("已保存");
    expect(tempMessage.value).toBe("已保存");

    vi.advanceTimersByTime(2000);
    expect(tempMessage.value).toBe("");
  });

  it("连续提示时后一条不会被前一条的计时器清掉", () => {
    const { tempMessage, showTempMessage } = useToast();

    showTempMessage("第一条");
    vi.advanceTimersByTime(1500);
    showTempMessage("第二条");

    // 距第一条已 2500ms：若旧计时器没清，这里会被抹成空
    vi.advanceTimersByTime(1000);
    expect(tempMessage.value).toBe("第二条");

    vi.advanceTimersByTime(1000);
    expect(tempMessage.value).toBe("");
  });

  it("作用域销毁后释放计时器", () => {
    const scope = effectScope();
    const { showTempMessage } = scope.run(() => useToast());

    showTempMessage("提示");
    expect(vi.getTimerCount()).toBe(1);

    scope.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
