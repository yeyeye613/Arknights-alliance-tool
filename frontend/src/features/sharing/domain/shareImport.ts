/**
 * 分享码解析与导入映射（纯函数）
 *
 * 从 useShareCode 抽出的部分：
 * - 解析（v3 紧凑码 + v1/v2 历史 ARKTEAM / ARKCOL）
 * - 码内干员序列 → 编队/合集对象
 *
 * 这里**不碰任何响应式状态，也不落库**：导入时由调用方（App.vue）
 * 决定把结果放进哪个列表、怎么持久化。原实现把 savedTeams /
 * teamCollections 两个 ref 直接传进函数里 push（审计 F1），已废弃。
 */
import pako from "pako";

import { decodeCompact, isCompactCode } from "@/features/sharing/domain/shareCodec.js";
import { getAvatarUrl } from "@/shared/lib/assets.js";
import { DEFAULT_VERSION_ID } from "@/data/versions.js";
import type { OperatorInstance } from "@/entities/operator";
import {
  findOperatorEverywhere,
  isSelfOperatorRegistered,
} from "@/entities/operator";
import type { SavedTeam, TeamCollection } from "@/entities/team";
import { getGameVersion } from "@/entities/version";

/** 历史前缀：v1/v2 时代的分享码，仍需能解析 */
const LEGACY_PREFIXES = ["ARKTEAM", "ARKCOL"] as const;

/** 干员在当前版本的自选干员配置中的缺省版本来自 data 注册表；这里只做协议映射 */
const nowText = (): string => new Date().toLocaleString();

/** 分享码里的干员条目（v3 紧凑格式） */
export interface ShareOperatorEntry {
  n: string;
  t?: string;
  e?: string[];
  s?: number | boolean;
}

/** 解析后的分享码载荷（v1 / v2 / v3 归一后） */
export interface ParsedShareData {
  v?: number;
  t?: string;
  type?: string;
  n?: string;
  ops?: Array<string | ShareOperatorEntry>;
  teams?: Array<{ n?: string; ops?: Array<string | ShareOperatorEntry> }>;
  g?: string;
}

/** 解 base64 + pako 的历史码体 */
function legacyDecode(base64: string): string {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return pako.inflate(bytes, { to: "string" }) as string;
}

/**
 * 解析 v1 / v2 历史码
 * @param code 完整分享码（含前缀）
 * @param prefixLength 前缀长度
 */
export function parseLegacyCode(
  code: string,
  prefixLength: number,
): ParsedShareData {
  let data: ParsedShareData;
  try {
    data = JSON.parse(legacyDecode(code.slice(prefixLength)));
  } catch {
    throw new Error("分享码已损坏，请重新复制完整内容");
  }

  if (data.v !== 1 && data.v !== 2) {
    throw new Error("不支持的密语版本");
  }

  // 兼容：t 与 type 统一
  data.type = data.t;
  return data;
}

/**
 * 解析分享码（自动识别 v3 紧凑码与历史前缀）
 *
 * 长码被聊天软件换行、复制带空格都很常见，这里先做归一化。
 * @param rawCode 用户输入的分享码
 */
export function parseShareCode(
  rawCode: string | null | undefined,
): ParsedShareData {
  const code = String(rawCode ?? "").replace(/\s+/g, "");
  if (!code) {
    throw new Error("密语不能为空");
  }

  // 历史前缀 ARKTEAM / ARKCOL 也以 A 开头，必须先判断
  const legacyPrefix = LEGACY_PREFIXES.find((prefix) =>
    code.startsWith(prefix),
  );
  if (legacyPrefix !== undefined) {
    return parseLegacyCode(code, legacyPrefix.length);
  }

  if (isCompactCode(code)) {
    const data = decodeCompact(code) as ParsedShareData;
    data.type = data.t;
    return data;
  }

  throw new Error("无效的密语格式");
}

/**
 * 还原分享码中的干员列表
 *
 * 找不到的干员会被跳过（跨版本导入的常见情况），
 * 全部找不到时由 importTeam 报错。
 * @param ops 分享码里的干员序列
 * @param versionId 分享码所属版本（决定自选干员判定与等阶回退）
 */
export function restoreOperators(
  ops: ReadonlyArray<string | ShareOperatorEntry> | null | undefined,
  versionId: string = DEFAULT_VERSION_ID,
): OperatorInstance[] {
  const version = getGameVersion(versionId);

  return (ops ?? [])
    .map((entry, index): OperatorInstance | null => {
      const name = typeof entry === "string" ? entry : entry?.n;
      if (!name) {
        return null;
      }

      // 干员在数据里查不到就跳过：跨版本导入会遇到这种情况
      if (!findOperatorEverywhere(name)) {
        console.warn(`未找到干员: ${name}`);
        return null;
      }

      const tier = typeof entry === "object" ? entry?.t : "";
      const equipments =
        typeof entry === "object" && Array.isArray(entry?.e) ? entry.e : [];
      // 新码里带 s 标记；旧码只存名字，只能按「当前版本没有、但自选配置里有」推断
      const isSelfOperator =
        typeof entry === "object"
          ? Boolean(entry?.s)
          : !version.operators?.[name] && isSelfOperatorRegistered(name);

      return {
        id: index,
        name,
        avatar: getAvatarUrl(name),
        tier: tier || undefined,
        isSelfOperator,
        ...(equipments.length ? { equipments } : {}),
      };
    })
    .filter((op): op is OperatorInstance => op !== null);
}

/**
 * 分享码载荷 → 已保存编队
 * @param data 解析后的载荷
 * @param versionId 导入时所在的版本（载荷里没有版本号时兜底）
 */
export function mapImportedTeam(
  data: ParsedShareData,
  versionId?: string,
): SavedTeam {
  const version = data?.g || versionId;
  // 干员解析只看载荷里的版本（历史行为：没有版本号时按默认版本推断自选干员）
  const team = restoreOperators(data?.ops, data?.g);

  if (team.length === 0) {
    throw new Error("编队中没有有效干员");
  }

  return {
    name: data?.n ?? "",
    team,
    createTime: nowText(),
    ...(version ? { version } : {}),
  };
}

/**
 * 分享码载荷 → 合集
 * @param data 解析后的载荷
 * @param versionId 导入时所在的版本（载荷里没有版本号时兜底）
 */
export function mapImportedCollection(
  data: ParsedShareData,
  versionId?: string,
): TeamCollection {
  const version = data?.g || versionId;

  const teams: SavedTeam[] = (data?.teams ?? [])
    .map((teamData) => {
      const team = restoreOperators(teamData?.ops, data?.g);
      return {
        name: teamData?.n ?? "",
        team,
        createTime: nowText(),
        ...(version ? { version } : {}),
      };
    })
    .filter((team) => team.team.length > 0);

  if (teams.length === 0) {
    throw new Error("合集中没有有效编队");
  }

  return {
    name: data?.n ?? "",
    teams,
    expanded: true,
    ...(version ? { version } : {}),
  };
}
