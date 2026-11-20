/**
 * 分享码编解码（协议 v3）
 *
 * v1 / v2 是「JSON + deflate + base64」，干员名直接以 UTF-8 存进去，
 * 一个 12 人编队要 170+ 字符。v3 改为二进制：
 *
 *   头部  1B  0xC0 | 类型（1 编队 / 2 合集 / 3 全部）
 *   标志  1B  bit0 = 已 deflate，bit1 = 带版本号
 *   版本  1B （可选，见 VERSION_CODES，只允许追加）
 *   名称  varint 长度 + UTF-8
 *   编队  varint 队伍数 → 每队（名称 + varint 干员数 + 干员引用…）
 *   干员  varint(ref<<1 | 自选标记)，自选干员再跟 1B 阶数；ref = 8191 表示码表外，后跟字面名字
 *
 * 最后整体用 Base62 编码，不含 + / = 等会被聊天软件或 URL 吃掉的字符。
 * 同样的编队从 179 字符降到 40~50 字符。
 *
 * 类型化的约束（P5-f）：**只加标注，不改任何表达式**。
 * 二进制布局、字段顺序、72 字节阈值都是协议本身，见重构计划第 12 节。
 */
import pako from "pako";
import codebook from "@/data/opCodebook.json";
import equipCodebook from "@/data/equipCodebook.json";
import { ShareError } from "@/features/sharing/domain/shareErrors";

/** 协议前缀（v3 使用单字符，v1/v2 的 ARKTEAM / ARKCOL 优先匹配） */
const CODE_PREFIX = "A";

const MAGIC = 0xc0;
/** 带装备字段的分享码用不同 magic，旧版本解码器会直接判为无效而不是错读 */
const MAGIC_EQUIP = 0xd0;
const TYPE_TEAM = 1;
const TYPE_COLLECTION = 2;
// 3 号类型（全量导出）已废弃：从未上线过 UI，也没有任何历史码，
// 因此不再生成也不再解析（P1 清理，见 docs/architecture/refactoring-plan.md）

const FLAG_COMPRESSED = 1;
const FLAG_VERSION = 2;

/** 码表外干员：后面跟字面名字 */
const ESCAPE_REF = 8191;

/** 版本号 → 字节。只允许在末尾追加，不要重排 */
const VERSION_CODES: string[] = ["mengyue", "guicheng"];

const TIERS = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ", "Ⅺ", "Ⅻ"];
const TIER_UNKNOWN = 13;
const TIER_NONE = 0;

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 写入时接受的干员形状：允许直接给名字，也允许给界面拼装的实例 */
type OperatorLike =
  | string
  | {
      name?: string;
      tier?: string;
      isSelfOperator?: boolean;
      equipments?: string[];
    }
  | null
  | undefined;

/** 写入时接受的编队形状：`team`（运行时）与 `ops`（解码结果）两种写法都支持 */
interface TeamLike {
  name?: string;
  n?: string;
  team?: OperatorLike[];
  ops?: OperatorLike[];
}

/** 解码出的干员：名字字符串，或带阶数 / 自选标记 / 装备的对象 */
type DecodedOperator =
  | string
  | { n: string; t?: string; s?: 1; e?: string[] };

/** 解码出的编队 */
interface DecodedTeam {
  n: string;
  ops: DecodedOperator[];
}

/** 解码结果（v1/v2 的历史结构也由上层补成这个形状） */
export interface DecodedShareData {
  v: number;
  t?: "team" | "collection";
  n?: string;
  ops?: DecodedOperator[];
  teams?: DecodedTeam[];
  g?: string;
}

/** 干员名 → 码表下标 */
const NAME_TO_INDEX = new Map<string, number>(
  codebook.map((name, index): [string, number] => [name, index]),
);
/** 装备名 → 码表下标 */
const EQUIP_TO_INDEX = new Map<string, number>(
  equipCodebook.map((name, index): [string, number] => [name, index]),
);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function getCodebook(): string[] {
  return codebook;
}

/* ------------------------------ 基础读写 ------------------------------ */

function writeVarint(out: number[], value: number): void {
  let n = value;
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  out.push(n);
}

function writeString(out: number[], text?: string): void {
  const bytes = encoder.encode(text || "");
  writeVarint(out, bytes.length);
  for (const byte of bytes) out.push(byte);
}

interface Reader {
  readonly pos: number;
  readonly done: boolean;
  byte(): number;
  varint(): number;
  string(): string;
}

function createReader(bytes: Uint8Array): Reader {
  let pos = 0;
  return {
    get pos() {
      return pos;
    },
    get done() {
      return pos >= bytes.length;
    },
    byte() {
      if (pos >= bytes.length) throw new ShareError("INCOMPLETE");
      return bytes[pos++];
    },
    varint() {
      let result = 0;
      let shift = 0;
      for (;;) {
        const byte = this.byte();
        result += (byte & 0x7f) * 2 ** shift;
        if ((byte & 0x80) === 0) return result;
        shift += 7;
        if (shift > 35) throw new ShareError("DATA_CORRUPT");
      }
    },
    string() {
      const length = this.varint();
      if (pos + length > bytes.length) throw new ShareError("INCOMPLETE");
      const slice = bytes.subarray(pos, pos + length);
      pos += length;
      return decoder.decode(slice);
    },
  };
}

/* ------------------------------ Base62 ------------------------------ */

function toBase62(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  if (value === 0n) return ALPHABET[0];
  let out = "";
  while (value > 0n) {
    out = ALPHABET[Number(value % 62n)] + out;
    value /= 62n;
  }
  return out;
}

function fromBase62(text: string): Uint8Array {
  if (!/^[0-9A-Za-z]+$/.test(text)) {
    throw new ShareError("BAD_CHAR");
  }
  let value = 0n;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) throw new ShareError("BAD_CHAR");
    value = value * 62n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value >>= 8n;
  }
  return Uint8Array.from(bytes);
}

/* ------------------------------ 干员引用 ------------------------------ */

/**
 * @param out 输出字节缓冲
 * @param op 干员名，或 { name, tier, isSelfOperator, equipments }
 * @param withEquipment 是否写入装备（决定 0xd0 magic，必须与解码一致）
 */
function writeOperator(
  out: number[],
  op: OperatorLike,
  withEquipment: boolean,
): void {
  const name = typeof op === "string" ? op : op?.name;
  const tier = typeof op === "object" ? op?.tier || "" : "";
  const isSelf =
    typeof op === "object" ? Boolean(op?.isSelfOperator) : false;
  const index = NAME_TO_INDEX.get(name as string);

  const ref = index === undefined ? ESCAPE_REF : index;
  writeVarint(out, ref * 2 + (isSelf ? 1 : 0));

  if (index === undefined) writeString(out, name);
  if (isSelf) {
    const tierCode = TIERS.indexOf(tier);
    if (tier && tierCode < 0) {
      out.push(TIER_UNKNOWN);
      writeString(out, tier);
    } else {
      out.push(tierCode < 0 ? TIER_NONE : tierCode);
    }
  }

  if (withEquipment) {
    const equipments = (
      typeof op === "object" ? op?.equipments || [] : []
    ).filter(Boolean);
    writeVarint(out, equipments.length);
    for (const equip of equipments) {
      const equipIndex = EQUIP_TO_INDEX.get(equip);
      const equipRef = equipIndex === undefined ? ESCAPE_REF : equipIndex;
      writeVarint(out, equipRef);
      if (equipIndex === undefined) writeString(out, equip);
    }
  }
}

/**
 * @returns 与 v1/v2 的 ops 结构保持一致
 */
function readOperator(
  reader: Reader,
  withEquipment: boolean,
): DecodedOperator {
  const ref = reader.varint();
  const isSelf = ref % 2 === 1;
  const index = (ref - (isSelf ? 1 : 0)) / 2;

  const name = index === ESCAPE_REF ? reader.string() : codebook[index];
  if (name === undefined) {
    throw new ShareError("VERSION_TOO_NEW");
  }

  let entry: DecodedOperator = name;
  if (isSelf) {
    const tierCode = reader.byte();
    const tier =
      tierCode === TIER_UNKNOWN ? reader.string() : (TIERS[tierCode] ?? "");
    entry = tier ? { n: name, t: tier, s: 1 } : { n: name, s: 1 };
  }

  if (withEquipment) {
    const count = reader.varint();
    const equipments: string[] = [];
    for (let i = 0; i < count; i++) {
      const equipRef = reader.varint();
      equipments.push(
        equipRef === ESCAPE_REF ? reader.string() : equipCodebook[equipRef],
      );
    }
    if (typeof entry === "string") entry = { n: entry };
    entry.e = equipments.filter(Boolean);
  }

  return entry;
}

/* ------------------------------ 结构读写 ------------------------------ */

function writeTeam(
  out: number[],
  team: TeamLike | null | undefined,
  withEquipment: boolean,
): void {
  writeString(out, team?.n || team?.name || "");
  const ops = team?.ops || team?.team || [];
  writeVarint(out, ops.length);
  for (const op of ops) writeOperator(out, op, withEquipment);
}

function readTeam(reader: Reader, withEquipment: boolean): DecodedTeam {
  const name = reader.string();
  const count = reader.varint();
  const ops: DecodedOperator[] = [];
  for (let i = 0; i < count; i++) ops.push(readOperator(reader, withEquipment));
  return { n: name, ops };
}

function readTeams(reader: Reader, withEquipment: boolean): DecodedTeam[] {
  const count = reader.varint();
  const teams: DecodedTeam[] = [];
  for (let i = 0; i < count; i++) teams.push(readTeam(reader, withEquipment));
  return teams;
}

function versionToByte(versionId?: string): number | undefined {
  if (!versionId) return undefined;
  const index = VERSION_CODES.indexOf(versionId);
  return index < 0 ? undefined : index;
}

/* ------------------------------ 对外编码 ------------------------------ */

function finish(
  type: number,
  body: number[],
  versionId: string | undefined,
  withEquipment: boolean,
): string {
  const head = [(withEquipment ? MAGIC_EQUIP : MAGIC) | type, 0];
  const versionByte = versionToByte(versionId);
  if (versionByte !== undefined) {
    head[1] |= FLAG_VERSION;
    head.push(versionByte);
  }

  let payload = Uint8Array.from(body);
  // 短码压缩只会更胖（deflate 头部 5B + 熵编码开销），超过阈值才值得压
  if (payload.length > 72) {
    payload = pako.deflate(payload, { level: 9 });
    head[1] |= FLAG_COMPRESSED;
  }

  const bytes = new Uint8Array(head.length + payload.length);
  bytes.set(head, 0);
  bytes.set(payload, head.length);
  return CODE_PREFIX + toBase62(bytes);
}

/** 是否有干员带装备（决定是否启用 0xd0 格式） */
function hasAnyEquipment(teams: TeamLike[]): boolean {
  return teams.some((team) =>
    (team?.team || team?.ops || []).some(
      (op) =>
        typeof op === "object" &&
        op?.equipments?.filter(Boolean).length,
    ),
  );
}

/**
 * @param team { name, team: [{ name, tier?, isSelfOperator?, equipments? }] }
 */
export function encodeTeam(team: TeamLike, versionId?: string): string {
  const body: number[] = [];
  const ops = team?.team || team?.ops || [];
  const withEquipment = hasAnyEquipment([team]);
  writeString(body, team?.name || "");
  writeVarint(body, ops.length);
  for (const op of ops) writeOperator(body, op, withEquipment);
  return finish(TYPE_TEAM, body, versionId, withEquipment);
}

/**
 * @param collection { name, teams: [{ name, team: [...] }] }
 */
export function encodeCollection(
  collection: { name?: string; teams?: TeamLike[] },
  versionId?: string,
): string {
  const body: number[] = [];
  const teams = collection?.teams || [];
  const withEquipment = hasAnyEquipment(teams);
  writeString(body, collection?.name || "");
  writeVarint(body, teams.length);
  for (const team of teams) writeTeam(body, team, withEquipment);
  return finish(TYPE_COLLECTION, body, versionId, withEquipment);
}

/* ------------------------------ 对外解码 ------------------------------ */

/**
 * 判断是否为 v3 分享码（不含 ARKTEAM 等历史前缀）
 */
export function isCompactCode(code: string): boolean {
  return typeof code === "string" && code.startsWith(CODE_PREFIX);
}

/**
 * @param code 去掉前缀后的 Base62 串
 */
export function decodeCompact(code: string): DecodedShareData {
  const raw = fromBase62(code.slice(CODE_PREFIX.length));
  if (!raw.length) throw new ShareError("EMPTY_PAYLOAD");

  const head = raw[0];
  const magic = head & 0xf0;
  if (magic !== MAGIC && magic !== MAGIC_EQUIP) {
    throw new ShareError("BAD_FORMAT");
  }
  const withEquipment = magic === MAGIC_EQUIP;
  const type = head & 0x0f;
  const flags = raw[1] ?? 0;

  let offset = 2;
  let versionId: string | undefined;
  if (flags & FLAG_VERSION) {
    versionId = VERSION_CODES[raw[offset]];
    offset += 1;
  }

  let payload = raw.subarray(offset);
  if (flags & FLAG_COMPRESSED) {
    try {
      payload = pako.inflate(payload);
    } catch {
      // pako 自身的报错是英文且面向开发者，不能漏到界面
      throw new ShareError("DATA_CORRUPT");
    }
  }

  const reader = createReader(payload);
  const data: DecodedShareData = { v: 3 };

  if (type === TYPE_TEAM) {
    data.t = "team";
    data.n = reader.string();
    const count = reader.varint();
    data.ops = [];
    for (let i = 0; i < count; i++)
      data.ops.push(readOperator(reader, withEquipment));
  } else if (type === TYPE_COLLECTION) {
    data.t = "collection";
    data.n = reader.string();
    data.teams = readTeams(reader, withEquipment);
  } else {
    throw new ShareError("UNSUPPORTED_TYPE");
  }

  if (versionId) data.g = versionId;
  return data;
}
