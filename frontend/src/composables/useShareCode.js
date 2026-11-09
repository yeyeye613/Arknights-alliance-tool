import pako from "pako";
import selfOpConfig from "../data/selfOp.json";
import {
  DEFAULT_VERSION_ID,
  findOperatorEverywhere,
  getGameVersion,
} from "@/data/versions.js";
import { getAvatarUrl } from "@/utils/index.js";
import {
  decodeCompact,
  encodeCollection,
  encodeFull,
  encodeTeam,
  isCompactCode,
} from "@/utils/shareCodec.js";

/* v1 / v2 历史前缀：仍可解析，新码不再使用 */
const LEGACY_PFX_TEAM = "ARKTEAM";
const LEGACY_PFX_COL = "ARKCOL";
const LEGACY_PFX_FULL = "ARKFULL";

function legacyDecode(base64) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return pako.inflate(bytes, { to: "string" });
}

export function useShareCode() {
  /**
   * 生成单个编队的分享码
   * @param {Object} teamData - 编队数据
   * @param {string} [versionId] - 所属游戏版本
   * @returns {string} 分享码
   */
  const generateTeamCode = (teamData, versionId) =>
    encodeTeam(teamData, versionId);

  const generateCollectionCode = (collection, versionId) =>
    encodeCollection(collection, versionId);

  const generateFullCode = (savedTeams, teamCollections, versionId) =>
    encodeFull(savedTeams, teamCollections, versionId);

  const parseCode = (rawCode) => {
    // 长码被聊天软件换行、复制带空格都很常见，先做归一化
    const code = String(rawCode || "").replace(/\s+/g, "");
    if (!code) {
      throw new Error("密语不能为空");
    }

    // 历史前缀 ARKTEAM / ARKCOL / ARKFULL 也以 A 开头，必须先判断
    const legacyPrefix = [LEGACY_PFX_FULL, LEGACY_PFX_TEAM, LEGACY_PFX_COL].find(
      (prefix) => code.startsWith(prefix),
    );
    if (legacyPrefix) {
      return parseLegacy(code, legacyPrefix.length);
    }

    if (isCompactCode(code)) {
      const data = decodeCompact(code);
      data.type = data.t;
      return data;
    }

    throw new Error("无效的密语格式");
  };

  const parseLegacy = (code, prefixLength) => {
    const base64Data = code.slice(prefixLength);

    let data;
    try {
      data = JSON.parse(legacyDecode(base64Data));
    } catch {
      throw new Error("分享码已损坏，请重新复制完整内容");
    }

    if (data.v !== 1 && data.v !== 2) {
      throw new Error("不支持的密语版本");
    }

    // 兼容: t 与 type 统一
    data.type = data.t;

    return data;
  };

  /**
   * 还原分享码中的干员列表
   * @param {Array} ops - 分享码里的干员序列
   * @param {string} [versionId] - 分享码所属游戏版本，用于判断是否为自选干员
   * @returns {Array} 干员列表
   */
  const restoreOperators = (ops, versionId = DEFAULT_VERSION_ID) => {
    const version = getGameVersion(versionId);
    return ops
      .map((entry, idx) => {
        const name = typeof entry === "string" ? entry : entry?.n;
        const tier = typeof entry === "object" ? entry?.t : "";
        const isSelfOperator =
          typeof entry === "object"
            ? Boolean(entry?.s)
            : !version.operators[name] && Boolean(selfOpConfig[name]);

        const opData = findOperatorEverywhere(name);
        if (!opData) {
          console.warn(`未找到干员: ${name}`);
          return null;
        }
        return {
          id: idx,
          name,
          avatar: getAvatarUrl(name),
          tier: tier || undefined,
          isSelfOperator,
        };
      })
      .filter((op) => op !== null);
  };

  const importTeam = (data) => {
    const teamOps = restoreOperators(data.ops, data.g);
    if (teamOps.length === 0) {
      throw new Error("编队中没有有效干员");
    }

    return {
      name: data.n,
      team: teamOps,
      createTime: new Date().toLocaleString(),
      ...(data.g ? { version: data.g } : {}),
    };
  };

  const importCollection = (data) => {
    const teams = data.teams
      .map((teamData) => {
        const teamOps = restoreOperators(teamData.ops, data.g);
        return {
          name: teamData.n,
          team: teamOps,
          createTime: new Date().toLocaleString(),
          ...(data.g ? { version: data.g } : {}),
        };
      })
      .filter((team) => team.team.length > 0);

    if (teams.length === 0) {
      throw new Error("合集中没有有效编队");
    }

    return {
      name: data.n,
      teams,
      expanded: true,
      ...(data.g ? { version: data.g } : {}),
    };
  };

  // 新增操作方法
  const shareTeam = (
    teamItem,
    currentShareTeam,
    shareType,
    shareCode,
    showShareModal,
    showTempMessage,
    versionId,
  ) => {
    currentShareTeam.value = { ...teamItem, type: "team" };
    shareType.value = "team";
    const code = generateTeamCode(teamItem, versionId);
    if (code) {
      shareCode.value = code;
      showShareModal.value = true;
    } else {
      showTempMessage("生成分享码失败");
    }
  };

  const shareCollection = (
    collection,
    currentShareCollection,
    shareType,
    shareCode,
    showShareModal,
    showTempMessage,
    versionId,
  ) => {
    currentShareCollection.value = { ...collection, type: "collection" };
    shareType.value = "collection";
    const code = generateCollectionCode(collection, versionId);
    if (code) {
      shareCode.value = code;
      showShareModal.value = true;
    } else {
      showTempMessage("生成分享码失败");
    }
  };

  const importFromCode = (
    data,
    savedTeams,
    teamCollections,
    saveAllData,
    saveCollections,
    showTempMessage,
    closeImportModal,
    versionId,
  ) => {
    try {
      const key = data.t || data.type;
      if (key === "team") {
        const newTeam = importTeam(data);
        if (!newTeam.version && versionId) {
          newTeam.version = versionId;
        }
        savedTeams.value.push(newTeam);
        saveAllData();
        showTempMessage(`成功导入编队「${newTeam.name}」`);
      } else if (key === "collection") {
        const importedCollection = importCollection(data);
        if (!importedCollection.version && versionId) {
          importedCollection.version = versionId;
          importedCollection.teams.forEach((team) => {
            if (!team.version) {
              team.version = versionId;
            }
          });
        }
        teamCollections.value.push(importedCollection);
        saveCollections();
        showTempMessage(`成功导入合集「${importedCollection.name}」`);
      } else {
        showTempMessage("不支持的数据类型");
      }

      closeImportModal();
    } catch (error) {
      showTempMessage(error.message || "导入失败");
    }
  };

  return {
    generateTeamCode,
    generateCollectionCode,
    generateFullCode,
    parseCode,
    importTeam,
    importCollection,
    restoreOperators,
    // 新增操作方法
    shareTeam,
    shareCollection,
    importFromCode,
  };
}
