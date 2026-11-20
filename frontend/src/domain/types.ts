/**
 * 核心实体的类型定义
 *
 * 目前只描述「领域函数真正读到」的字段，不对应完整的游戏数据文件。
 * 目的不是覆盖全部 JSON 字段，而是让 domain/ 下的纯函数有明确入参契约。
 * 后续（P4/P5）这些类型会迁到 entities/ 并成为全仓库唯一的数据形状来源。
 */

/** 盟约效果条目 */
export interface CovenantEffect {
  type: string;
  description: string;
  /** 生效条件，如「在场3名不同乌萨斯干员」 */
  condition?: string;
  /** 进阶后的描述 */
  upgraded?: string;
}

/** 盟约（核心 / 附加） */
export interface Covenant {
  name?: string;
  group: string;
  /** 激活所需人数 */
  activateCount: number;
  effects: CovenantEffect[];
  /**
   * PRTS 页面上列出的成员，仅作参考。
   * 运行时判定一律以 operator.covenants 为准（该字段已漂移，见审计 D2）。
   */
  operators?: string[];
}

/** 干员特质 */
export interface Trait {
  type?: string;
  trigger?: string;
  description?: string;
  upgraded?: string;
}

/** 干员静态数据（operators*.json 的条目） */
export interface OperatorBase {
  tier?: string;
  covenants?: string[];
  traits?: Trait[];
}

/**
 * 编队中的干员实例
 *
 * 注意：这不是静态数据，而是界面拼装出来的运行时对象。
 * 目前有 4 处各自拼装（PoolPanel / AddOpPanel / useShareCode / 存档），
 * 字段并不完全一致，P4 会收敛到统一的构造器。
 */
export interface OperatorInstance {
  id?: number | string;
  name: string;
  avatar?: string;
  tier?: string;
  isSelfOperator?: boolean;
  equipments?: string[];
}

/** 编队元素：允许直接给干员名（历史数据结构里 team 可能存字符串） */
export type TeamEntry = OperatorInstance | string | null | undefined;

/** 装备 */
export interface Equipment {
  tier: number;
  price?: number;
  base?: string;
  advanced?: string;
  desc?: string;
  /** 「变形同构体」搭配时授予的盟约名 */
  morph?: string;
  /** 组合装的组成件 */
  parts?: string[];
  combo?: string;
}

/** Ban 规则：规程版为 faction（Ban 阵营即整阵营隐藏），盟约版缺省 covenant */
export type BanStrategy = "faction" | "covenant";

/** 游戏版本（versions.js 注册表的条目） */
export interface GameVersion {
  id: string;
  label: string;
  shortLabel?: string;
  covenants: Record<string, Covenant>;
  operators: Record<string, OperatorBase>;
  equipments?: Record<string, Equipment>;
  banStrategy?: BanStrategy;
  selfOperatorStrategy?: "direct" | "faction";
}

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
