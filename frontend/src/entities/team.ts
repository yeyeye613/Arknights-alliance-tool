/**
 * 编队实体
 */
import type { OperatorInstance } from "./operator";

/** 已保存的编队 */
export interface SavedTeam {
  name: string;
  team: OperatorInstance[];
  createTime?: string;
  version?: string;
}

/** 合集 */
export interface TeamCollection {
  name: string;
  teams: SavedTeam[];
  version?: string;
  /** 仅 UI 用，落库前会被剥离 */
  expanded?: boolean;
}
