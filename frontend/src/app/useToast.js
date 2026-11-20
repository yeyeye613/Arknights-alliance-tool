import { getCurrentScope, onScopeDispose, ref } from "vue";

/** 提示默认停留时长（毫秒） */
const DEFAULT_DURATION = 2000;

/**
 * 顶部临时提示
 *
 * 连续触发时只保留最后一条：先清掉上一个计时器再起新的。
 * 否则前一条的 2 秒一到，会把后一条还没看完的提示一起抹掉。
 *
 * @param {number} duration 停留时长，测试里可缩短
 */
export function useToast(duration = DEFAULT_DURATION) {
  const tempMessage = ref("");
  let timer = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const showTempMessage = (msg) => {
    tempMessage.value = msg;
    clearTimer();
    timer = setTimeout(() => {
      tempMessage.value = "";
      timer = null;
    }, duration);
  };

  // 只有处在组件 / effect scope 里才注册清理，纯函数单测直接调用时不报错
  if (getCurrentScope()) {
    onScopeDispose(clearTimer);
  }

  return { tempMessage, showTempMessage };
}
