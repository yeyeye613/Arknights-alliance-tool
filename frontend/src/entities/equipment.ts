/**
 * 装备实体
 */
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
