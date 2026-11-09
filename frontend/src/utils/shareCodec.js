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

/** 协议前缀（v3 使用单字符，v1/v2 的 ARKTEAM / ARKCOL / ARKFULL 优先匹配） */
export const CODE_PREFIX = "A";

const MAGIC = 0xc0;
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
 * @param {string|Object} op 干员名，或 { name, tier, isSelfOperator }
 */
function writeOperator(out, op) {
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
}

/**
 * @returns {string|Object} 与 v1/v2 的 ops 结构保持一致
 */
function readOperator(reader) {
  const ref = reader.varint();
  const isSelf = ref % 2 === 1;
  const index = (ref - (isSelf ? 1 : 0)) / 2;

  const name = index === ESCAPE_REF ? reader.string() : codebook[index];
  if (name === undefined) {
    throw new Error("分享码来自更新的版本，请刷新页面后再导入");
  }
  if (!isSelf) return name;

  const tierCode = reader.byte();
  const tier =
    tierCode === TIER_UNKNOWN ? reader.string() : (TIERS[tierCode] ?? "");
  return tier ? { n: name, t: tier, s: 1 } : { n: name, s: 1 };
}

/* ------------------------------ 结构读写 ------------------------------ */

function writeTeam(out, team) {
  writeString(out, team?.n || team?.name || "");
  const ops = team?.ops || team?.team || [];
  writeVarint(out, ops.length);
  for (const op of ops) writeOperator(out, op);
}

function readTeam(reader) {
  const name = reader.string();
  const count = reader.varint();
  const ops = [];
  for (let i = 0; i < count; i++) ops.push(readOperator(reader));
  return { n: name, ops };
}

function readTeams(reader) {
  const count = reader.varint();
  const teams = [];
  for (let i = 0; i < count; i++) teams.push(readTeam(reader));
  return teams;
}

function versionToByte(versionId) {
  const index = VERSION_CODES.indexOf(versionId);
  return index < 0 ? undefined : index;
}

/* ------------------------------ 对外编码 ------------------------------ */

function finish(type, body, versionId) {
  const head = [MAGIC | type, 0];
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

/**
 * @param {Object} team { name, team: [{ name, tier?, isSelfOperator? }] }
 * @param {string} [versionId]
 */
export function encodeTeam(team, versionId) {
  const body = [];
  writeString(body, team?.name || "");
  const ops = team?.team || team?.ops || [];
  writeVarint(body, ops.length);
  for (const op of ops) writeOperator(body, op);
  return finish(TYPE_TEAM, body, versionId);
}

/**
 * @param {Object} collection { name, teams: [{ name, team: [...] }] }
 */
export function encodeCollection(collection, versionId) {
  const body = [];
  writeString(body, collection?.name || "");
  const teams = collection?.teams || [];
  writeVarint(body, teams.length);
  for (const team of teams) writeTeam(body, team);
  return finish(TYPE_COLLECTION, body, versionId);
}

/**
 * @param {Array} savedTeams
 * @param {Array} collections
 */
export function encodeFull(savedTeams, collections, versionId) {
  const body = [];
  writeString(body, "");
  writeVarint(body, savedTeams.length);
  for (const team of savedTeams) writeTeam(body, team);
  writeVarint(body, collections.length);
  for (const collection of collections) {
    writeString(body, collection?.name || "");
    const teams = collection?.teams || [];
    writeVarint(body, teams.length);
    for (const team of teams) writeTeam(body, team);
  }
  return finish(TYPE_FULL, body, versionId);
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
  if ((head & 0xf0) !== MAGIC) throw new Error("无效的分享码格式");
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
    for (let i = 0; i < count; i++) data.ops.push(readOperator(reader));
  } else if (type === TYPE_COLLECTION) {
    data.t = "collection";
    data.n = reader.string();
    data.teams = readTeams(reader);
  } else if (type === TYPE_FULL) {
    data.t = "full";
    data.n = reader.string();
    data.teams = readTeams(reader);
    const collectionCount = reader.varint();
    data.collections = [];
    for (let i = 0; i < collectionCount; i++) {
      const name = reader.string();
      data.collections.push({ n: name, teams: readTeams(reader) });
    }
  } else {
    throw new Error("不支持的分享码类型");
  }

  if (versionId) data.g = versionId;
  return data;
}
