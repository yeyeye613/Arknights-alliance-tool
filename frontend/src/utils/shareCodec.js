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
 */
import pako from "pako";
import codebook from "@/data/opCodebook.json";
import equipCodebook from "@/data/equipCodebook.json";

/** 协议前缀（v3 使用单字符，v1/v2 的 ARKTEAM / ARKCOL / ARKFULL 优先匹配） */
export const CODE_PREFIX = "A";

const MAGIC = 0xc0;
/** 带装备字段的分享码用不同 magic，旧版本解码器会直接判为无效而不是错读 */
const MAGIC_EQUIP = 0xd0;
const TYPE_TEAM = 1;
const TYPE_COLLECTION = 2;
const TYPE_FULL = 3;

const FLAG_COMPRESSED = 1;
const FLAG_VERSION = 2;

/** 码表外干员：后面跟字面名字 */
const ESCAPE_REF = 8191;

/** 版本号 → 字节。只允许在末尾追加，不要重排 */
const VERSION_CODES = ["mengyue", "guicheng"];

const TIERS = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ", "Ⅺ", "Ⅻ"];
const TIER_UNKNOWN = 13;
const TIER_NONE = 0;

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 干员名 → 码表下标 */
const NAME_TO_INDEX = new Map(codebook.map((name, index) => [name, index]));
/** 装备名 → 码表下标 */
const EQUIP_TO_INDEX = new Map(
  equipCodebook.map((name, index) => [name, index]),
);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function getCodebook() {
  return codebook;
}

/* ------------------------------ 基础读写 ------------------------------ */

function writeVarint(out, value) {
  let n = value;
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  out.push(n);
}

function writeString(out, text) {
  const bytes = encoder.encode(text || "");
  writeVarint(out, bytes.length);
  for (const byte of bytes) out.push(byte);
}

function createReader(bytes) {
  let pos = 0;
  return {
    get pos() {
      return pos;
    },
    get done() {
      return pos >= bytes.length;
    },
    byte() {
      if (pos >= bytes.length) throw new Error("分享码数据不完整");
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
        if (shift > 35) throw new Error("分享码数据损坏");
      }
    },
    string() {
      const length = this.varint();
      if (pos + length > bytes.length) throw new Error("分享码数据不完整");
      const slice = bytes.subarray(pos, pos + length);
      pos += length;
      return decoder.decode(slice);
    },
  };
}

/* ------------------------------ Base62 ------------------------------ */

function toBase62(bytes) {
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

function fromBase62(text) {
  if (!/^[0-9A-Za-z]+$/.test(text)) {
    throw new Error("分享码包含非法字符");
  }
  let value = 0n;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) throw new Error("分享码包含非法字符");
    value = value * 62n + BigInt(digit);
  }
  const bytes = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value >>= 8n;
  }
  return Uint8Array.from(bytes);
}

/* ------------------------------ 干员引用 ------------------------------ */

/**
 * @param {Object} out 输出字节缓冲
 * @param {string|Object} op 干员名，或 { name, tier, isSelfOperator, equipments }
 * @param {boolean} withEquipment 是否写入装备（决定 0xd0 magic，必须与解码一致）
 */
function writeOperator(out, op, withEquipment) {
  const name = typeof op === "string" ? op : op?.name;
  const tier = typeof op === "object" ? op?.tier || "" : "";
  const isSelf = typeof op === "object" ? Boolean(op?.isSelfOperator) : false;
  const index = NAME_TO_INDEX.get(name);

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
    const equipments = (typeof op === "object" ? op?.equipments || [] : []).filter(
      Boolean,
    );
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
 * @param {boolean} withEquipment
 * @returns {string|Object} 与 v1/v2 的 ops 结构保持一致
 */
function readOperator(reader, withEquipment) {
  const ref = reader.varint();
  const isSelf = ref % 2 === 1;
  const index = (ref - (isSelf ? 1 : 0)) / 2;

  const name = index === ESCAPE_REF ? reader.string() : codebook[index];
  if (name === undefined) {
    throw new Error("分享码来自更新的版本，请刷新页面后再导入");
  }

  let entry = name;
  if (isSelf) {
    const tierCode = reader.byte();
    const tier =
      tierCode === TIER_UNKNOWN ? reader.string() : (TIERS[tierCode] ?? "");
    entry = tier ? { n: name, t: tier, s: 1 } : { n: name, s: 1 };
  }

  if (withEquipment) {
    const count = reader.varint();
    const equipments = [];
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

function writeTeam(out, team, withEquipment) {
  writeString(out, team?.n || team?.name || "");
  const ops = team?.ops || team?.team || [];
  writeVarint(out, ops.length);
  for (const op of ops) writeOperator(out, op, withEquipment);
}

function readTeam(reader, withEquipment) {
  const name = reader.string();
  const count = reader.varint();
  const ops = [];
  for (let i = 0; i < count; i++) ops.push(readOperator(reader, withEquipment));
  return { n: name, ops };
}

function readTeams(reader, withEquipment) {
  const count = reader.varint();
  const teams = [];
  for (let i = 0; i < count; i++) teams.push(readTeam(reader, withEquipment));
  return teams;
}

function versionToByte(versionId) {
  const index = VERSION_CODES.indexOf(versionId);
  return index < 0 ? undefined : index;
}

/* ------------------------------ 对外编码 ------------------------------ */

function finish(type, body, versionId, withEquipment) {
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
function hasAnyEquipment(teams) {
  return teams.some((team) =>
    (team?.team || team?.ops || []).some(
      (op) => typeof op === "object" && op?.equipments?.filter(Boolean).length,
    ),
  );
}

/**
 * @param {Object} team { name, team: [{ name, tier?, isSelfOperator?, equipments? }] }
 * @param {string} [versionId]
 */
export function encodeTeam(team, versionId) {
  const body = [];
  const ops = team?.team || team?.ops || [];
  const withEquipment = hasAnyEquipment([team]);
  writeString(body, team?.name || "");
  writeVarint(body, ops.length);
  for (const op of ops) writeOperator(body, op, withEquipment);
  return finish(TYPE_TEAM, body, versionId, withEquipment);
}

/**
 * @param {Object} collection { name, teams: [{ name, team: [...] }] }
 */
export function encodeCollection(collection, versionId) {
  const body = [];
  const teams = collection?.teams || [];
  const withEquipment = hasAnyEquipment(teams);
  writeString(body, collection?.name || "");
  writeVarint(body, teams.length);
  for (const team of teams) writeTeam(body, team, withEquipment);
  return finish(TYPE_COLLECTION, body, versionId, withEquipment);
}

/**
 * @param {Array} savedTeams
 * @param {Array} collections
 */
export function encodeFull(savedTeams, collections, versionId) {
  const body = [];
  const allTeams = [
    ...savedTeams,
    ...collections.flatMap((collection) => collection?.teams || []),
  ];
  const withEquipment = hasAnyEquipment(allTeams);

  writeString(body, "");
  writeVarint(body, savedTeams.length);
  for (const team of savedTeams) writeTeam(body, team, withEquipment);
  writeVarint(body, collections.length);
  for (const collection of collections) {
    writeString(body, collection?.name || "");
    const teams = collection?.teams || [];
    writeVarint(body, teams.length);
    for (const team of teams) writeTeam(body, team, withEquipment);
  }
  return finish(TYPE_FULL, body, versionId, withEquipment);
}

/* ------------------------------ 对外解码 ------------------------------ */

/**
 * 判断是否为 v3 分享码（不含 ARKTEAM 等历史前缀）
 * @param {string} code
 */
export function isCompactCode(code) {
  return typeof code === "string" && code.startsWith(CODE_PREFIX);
}

/**
 * @param {string} code 去掉前缀后的 Base62 串
 * @returns {{v:number,t:string,n:string,ops?:Array,teams?:Array,collections?:Array,g?:string}}
 */
export function decodeCompact(code) {
  const raw = fromBase62(code.slice(CODE_PREFIX.length));
  if (!raw.length) throw new Error("分享码内容为空");

  const head = raw[0];
  const magic = head & 0xf0;
  if (magic !== MAGIC && magic !== MAGIC_EQUIP) {
    throw new Error("无效的分享码格式");
  }
  const withEquipment = magic === MAGIC_EQUIP;
  const type = head & 0x0f;
  const flags = raw[1] ?? 0;

  let offset = 2;
  let versionId;
  if (flags & FLAG_VERSION) {
    versionId = VERSION_CODES[raw[offset]];
    offset += 1;
  }

  let payload = raw.subarray(offset);
  if (flags & FLAG_COMPRESSED) {
    payload = pako.inflate(payload);
  }

  const reader = createReader(payload);
  const data = { v: 3 };

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
  } else if (type === TYPE_FULL) {
    data.t = "full";
    data.n = reader.string();
    data.teams = readTeams(reader, withEquipment);
    const collectionCount = reader.varint();
    data.collections = [];
    for (let i = 0; i < collectionCount; i++) {
      const name = reader.string();
      data.collections.push({ n: name, teams: readTeams(reader, withEquipment) });
    }
  } else {
    throw new Error("不支持的分享码类型");
  }

  if (versionId) data.g = versionId;
  return data;
}
