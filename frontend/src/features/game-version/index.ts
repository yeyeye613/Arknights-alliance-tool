/**
 * game-version 的公开出口
 *
 * 只导出别的 feature 与 `app/` 真的在用的符号，不做 `export *`：
 * 桶里的每个导出都会把对应模块拉进消费方的依赖图。
 */
export { default as VersionSwitch } from "./components/VersionSwitch.vue";
export { useGameVersion } from "./composables/useGameVersion.js";
