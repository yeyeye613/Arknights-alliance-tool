import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * ESLint 扁平配置
 *
 * 只开「正确性」规则（essential / recommended），不引入排版类规则：
 * 存量代码的风格由 Prettier 负责，且尚未整体格式化，
 * 让 lint 承担缩进缩排的职责会一次性产生上千行无意义 diff。
 */

/** TypeScript 文件范围：tseslint 的 base 配置会把 parser 装到全局，
 *  必须显式限定文件，否则 .vue 会被当成 TS 解析 */
const TS_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];

const scopeToTs = (configs) =>
  configs.map((config) => ({ ...config, files: TS_FILES }));

export default [
  {
    name: "项目忽略项",
    ignores: [
      "dist/**",
      "dev-dist/**",
      "coverage/**",
      "node_modules/**",
      "public/**",
    ],
  },

  js.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  ...scopeToTs(tseslint.configs.recommended),

  {
    name: "源码",
    files: ["**/*.{js,mjs,ts,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        // <script setup> 的编译宏，运行时并不存在，需显式声明
        defineProps: "readonly",
        defineEmits: "readonly",
        defineExpose: "readonly",
        defineOptions: "readonly",
        defineSlots: "readonly",
        defineModel: "readonly",
        withDefaults: "readonly",
      },
    },
    rules: {
      // 未使用变量先降级为 warning：App.vue 里有 13 个历史遗留解构，
      // 清理放在后续阶段，P0 只保证「不新增」。
      "no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  {
    // 环境声明文件由脚手架生成，里面的 {} / any 是刻意的宽松写法
    name: "类型声明文件",
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    name: "测试与构建脚本",
    files: [
      "src/tests/**/*.js",
      "vite.config.ts",
      "scripts/**/*.mjs",
      "eslint.config.js",
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
