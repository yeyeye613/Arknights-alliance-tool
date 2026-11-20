/**
 * localStorage 键名常量
 *
 * **键名即用户数据契约**：改一个字符，老用户的编队、合集、偏好、自选干员就
 * 全部读不出来（表现是「数据没了」，且无法回滚）。因此这里只允许新增键，
 * 已有键的值一个字都不改。
 *
 * 键名的字面量只允许出现在本文件；其余代码通过 STORAGE_KEYS 引用，
 * 测试里保留字面量是为了独立断言契约本身。
 */
export const STORAGE_KEYS = {
  /** 未归类编队列表 */
  savedTeams: "arknights_saved_teams",
  /** 合集列表（含编队，不含 expanded） */
  teamCollections: "arknights_team_collections",
  /** 当前游戏版本 id */
  gameVersion: "arknights_game_version",
  /** 自选（甄选）干员 */
  selfOperators: "arknights_selected_self_operators",
  /** 筛选区图标 / 文字形态 */
  poolFilterView: "arknights_pool_filter_view",
  /** 筛选区折叠状态，"1" / "0" */
  poolFilterCollapsed: "arknights_pool_filter_collapsed",
} as const;
