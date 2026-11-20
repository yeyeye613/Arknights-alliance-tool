/**
 * 分享码门面
 *
 * 解析、历史码兼容、干员还原、载荷 → 编队/合集 的映射全部在
 * `src/domain/shareImport.ts`；本文件只保留两件事：
 * 1. 生成码（薄包装 shareCodec）
 * 2. 导入编排（把映射结果交给调用方提供的回调去落库）
 */
import { encodeCollection, encodeTeam } from "@/features/sharing/domain/shareCodec.js";
import {
  mapImportedCollection,
  mapImportedTeam,
  parseShareCode,
  restoreOperators,
} from "@/features/sharing/domain/shareImport";

export function useShareCode() {
  /**
   * 生成单个编队的分享码
   * @param {Object} teamData - 编队数据
   * @param {string} [versionId] - 所属游戏版本
   * @returns {string} 分享码
   */
  const generateTeamCode = (teamData, versionId) =>
    encodeTeam(teamData, versionId);

  /**
   * 生成合集的分享码
   * @param {Object} collection - 合集
   * @param {string} [versionId] - 所属游戏版本
   * @returns {string} 分享码
   */
  const generateCollectionCode = (collection, versionId) =>
    encodeCollection(collection, versionId);

  /** 解析分享码（v3 紧凑码 / v1 v2 历史码） */
  const parseCode = (rawCode) => parseShareCode(rawCode);

  /** 载荷 → 编队对象（不落库） */
  const importTeam = (data) => mapImportedTeam(data);

  /** 载荷 → 合集对象（不落库） */
  const importCollection = (data) => mapImportedCollection(data);

  /**
   * 把解析后的分享码写入存档
   *
   * 旧签名是 8 个位置参数，并且直接 push 进调用方的 savedTeams /
   * teamCollections（审计 F1：跨模块改状态）。现在改为显式回调，
   * 谁持有状态谁负责落库与持久化。
   *
   * @param {Object} data - parseCode 的结果
   * @param {Object} options
   * @param {string} [options.versionId] - 载荷未携带版本时的兜底版本
   * @param {(team: Object) => void} [options.addTeam] - 追加编队并持久化
   * @param {(collection: Object) => void} [options.addCollection] - 追加合集并持久化
   * @param {(message: string) => void} [options.notify] - 提示信息
   * @param {() => void} [options.close] - 关闭导入弹窗
   */
  const importFromCode = (data, options = {}) => {
    const { versionId, addTeam, addCollection, notify, close } = options;

    try {
      const key = data?.t || data?.type;

      if (key === "team") {
        const newTeam = mapImportedTeam(data, versionId);
        addTeam?.(newTeam);
        notify?.(`成功导入编队「${newTeam.name}」`);
      } else if (key === "collection") {
        const collection = mapImportedCollection(data, versionId);
        addCollection?.(collection);
        notify?.(`成功导入合集「${collection.name}」`);
      } else {
        notify?.("不支持的数据类型");
        close?.();
        return;
      }

      close?.();
    } catch (error) {
      notify?.(error?.message || "导入失败");
    }
  };

  return {
    generateTeamCode,
    generateCollectionCode,
    parseCode,
    importTeam,
    importCollection,
    restoreOperators,
    importFromCode,
  };
}
