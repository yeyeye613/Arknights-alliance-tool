/**
 * 图片加载失败的兜底处理
 * @param {Event} e - 图片错误事件
 * @param {string} size - 占位图尺寸，默认60x60
 */
export const handleImgError = (e) => {
  e.target.src = "https://placehold.co/60x60?text=None";
};

/**
 * 获取盟约图标地址
 * @param {string} name - 盟约名称
 * @returns {string} 图标完整路径
 */
export const getIconUrl = (name) => {
  return `${import.meta.env.BASE_URL}resource/image/盟约_${name}.png`;
};

/**
 * 获取头像图标地址
 * @param {string} name - 头像名称
 * @returns {string} 头像完整路径
 */
export const getAvatarUrl = (name) => {
  return `${import.meta.env.BASE_URL}resource/image/头像_${name}.png`;
};
