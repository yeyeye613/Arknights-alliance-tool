/**
 * 装备拖拽载荷
 *
 * 使用自定义 MIME，避免和干员拖拽（vue-draggable-plus 的 group="ops"）互相干扰；
 * 同时写一份 text/plain，方便个别浏览器 / 触控板手势降级。
 */

export const EQUIPMENT_DRAG_TYPE = "application/x-arknights-equipment";

/**
 * 仅凭 types 判断是否装备拖拽（dragover 阶段 getData 被浏览器保护返回空串，
 * 但 types 始终可读），用于决定是否显示放置高亮
 * @param {DragEvent} event
 * @returns {boolean}
 */
export function hasEquipmentDrag(event) {
  const dt = event?.dataTransfer;
  if (!dt) return false;
  return Array.from(dt.types || []).includes(EQUIPMENT_DRAG_TYPE);
}

/**
 * 从拖拽事件中读出装备信息
 *
 * 只有 dataTransfer 携带自定义 MIME 时才认作装备拖拽——
 * 干员排序（vue-draggable-plus）也会写 text/plain，
 * 若按文本回退会把干员名当成装备名，触发「装备槽已满」误报。
 *
 * @param {DragEvent} event
 * @returns {{name:string, from:string}|null}
 */
export function readEquipmentDrag(event) {
  const dt = event?.dataTransfer;
  if (!dt) return null;
  if (!Array.from(dt.types || []).includes(EQUIPMENT_DRAG_TYPE)) return null;

  const parse = (raw) => {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (!data?.name) return null;
      return { name: String(data.name), from: data.from || "pool" };
    } catch {
      // 非 JSON：直接把文本当装备名
      return { name: raw, from: "pool" };
    }
  };

  const custom = parse(dt.getData?.(EQUIPMENT_DRAG_TYPE));
  if (custom) return custom;

  return parse(dt.getData?.("text/plain"));
}
