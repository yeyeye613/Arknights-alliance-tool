import pako from "pako";
import operatorsConfig from "../data/operators.json";
import { getAvatarUrl } from "@/utils/index.js";

const PFX_TEAM = "ARKTEAM";
const PFX_COL = "ARKCOL";
const PFX_FULL = "ARKFULL";

function compressAndEncode(obj) {
  const jsonStr = JSON.stringify(obj);
  const compressed = pako.deflate(jsonStr, { level: 9 });
  const base64 = btoa(String.fromCharCode.apply(null, compressed));
  return base64;
}

function decodeAndDecompress(code) {
  const binaryStr = atob(code);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return pako.inflate(bytes, { to: "string" });
}

export function useShareCode() {
  const generateTeamCode = (teamData) => {
    const compactTeam = {
      v: 1,
      t: "team",
      n: teamData.name,
      ops: teamData.team.map((op) => op.name),
    };
    return `${PFX_TEAM}${compressAndEncode(compactTeam)}`;
  };

  const generateCollectionCode = (collection) => {
    const compactCollection = {
      v: 1,
      t: "collection",
      n: collection.name,
      teams: collection.teams.map((team) => ({
        n: team.name,
        ops: team.team.map((op) => op.name),
      })),
    };
    return `${PFX_COL}${compressAndEncode(compactCollection)}`;
  };

  const generateFullCode = (savedTeams, teamCollections) => {
    const fullData = {
      v: 1,
      t: "full",
      teams: savedTeams.map((team) => ({
        n: team.name,
        ops: team.team.map((op) => op.name),
      })),
      collections: teamCollections.map((collection) => ({
        n: collection.name,
        teams: collection.teams.map((team) => ({
          n: team.name,
          ops: team.team.map((op) => op.name),
        })),
      })),
    };
    return `${PFX_FULL}${compressAndEncode(fullData)}`;
  };

  const parseCode = (code) => {
    if (!code) {
      throw new Error("密语不能为空");
    }

    let prefix;
    let base64Data;

    if (code.startsWith(PFX_TEAM)) {
      prefix = PFX_TEAM;
      base64Data = code.slice(PFX_TEAM.length);
    } else if (code.startsWith(PFX_COL)) {
      prefix = PFX_COL;
      base64Data = code.slice(PFX_COL.length);
    } else if (code.startsWith(PFX_FULL)) {
      prefix = PFX_FULL;
      base64Data = code.slice(PFX_FULL.length);
    } else {
      throw new Error("无效的密语格式");
    }

    const decompressed = decodeAndDecompress(base64Data);
    const data = JSON.parse(decompressed);

    if (data.v !== 1) {
      throw new Error("不支持的密语版本");
    }

    // 兼容: t 与 type 统一
    data.type = data.t;

    return data;
  };

  const restoreOperators = (names) => {
    return names
      .map((name, idx) => {
        const opData = operatorsConfig[name];
        if (!opData) {
          console.warn(`未找到干员: ${name}`);
          return null;
        }
        return {
          id: idx,
          name,
          avatar: getAvatarUrl(name),
        };
      })
      .filter((op) => op !== null);
  };

  const importTeam = (data) => {
    const teamOps = restoreOperators(data.ops);
    if (teamOps.length === 0) {
      throw new Error("编队中没有有效干员");
    }

    return {
      name: data.n,
      team: teamOps,
      createTime: new Date().toLocaleString(),
    };
  };

  const importCollection = (data) => {
    const teams = data.teams
      .map((teamData) => {
        const teamOps = restoreOperators(teamData.ops);
        return {
          name: teamData.n,
          team: teamOps,
          createTime: new Date().toLocaleString(),
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
  ) => {
    currentShareTeam.value = { ...teamItem, type: "team" };
    shareType.value = "team";
    const code = generateTeamCode(teamItem);
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
  ) => {
    currentShareCollection.value = { ...collection, type: "collection" };
    shareType.value = "collection";
    const code = generateCollectionCode(collection);
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
  ) => {
    try {
      const key = data.t || data.type;
      if (key === "team") {
        const newTeam = importTeam(data);
        savedTeams.value.push(newTeam);
        saveAllData();
        showTempMessage(`成功导入编队「${newTeam.name}」`);
      } else if (key === "collection") {
        const importedCollection = importCollection(data);
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
