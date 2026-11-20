import { onMounted, ref, watch } from "vue";

import selfOpConfig from "@/data/selfOperators.json";
import {
  getSelfOperators,
  setSelfOperators,
} from "@/infrastructure/storage/preferencesRepository";
import { getAvatarUrl } from "@/shared/lib/assets.js";

/**
 * 自选（甄选）干员
 *
 * 五 / 六阶各可自选 2 名，登记在 `data/selfOperators.json`。这些干员不在任何版本的
 * 干员池里，但可以入队、参与盟约统计，因此干员池要把它们拼进列表。
 *
 * 校验规则只有一条：名字在 selfOperators.json 里、且阶数为 Ⅴ/Ⅵ。
 * 读取时按此重算，避免历史缓存里出现已下架或改阶的干员。
 */

/** 允许自选的阶数 */
const ALLOWED_TIERS = ["Ⅴ", "Ⅵ"];

/**
 * 过滤并补齐展示字段：非法的历史缓存会被丢弃
 * @param {Array} operators 缓存里的原始数据
 */
function normalizeSelfOperators(operators) {
  if (!Array.isArray(operators)) {
    return [];
  }

  return operators
    .filter((op) => selfOpConfig[op?.name] && ALLOWED_TIERS.includes(op?.tier))
    .map((op) => ({
      name: op.name,
      tier: op.tier,
      avatar: getAvatarUrl(op.name),
      isSelfOperator: true,
    }));
}

/** 自选干员列表：读取缓存 + 变更落盘 */
export function useSelfOperators() {
  const selfOperators = ref([]);

  onMounted(() => {
    selfOperators.value = normalizeSelfOperators(getSelfOperators());
  });

  watch(
    selfOperators,
    (value) => {
      setSelfOperators(value);
    },
    { deep: true },
  );

  return { selfOperators };
}
