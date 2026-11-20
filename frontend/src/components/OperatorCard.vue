<template>
  <div
    class="op-unit"
    :class="{
      'op-missing': missing,
      'drop-ready': dropReady,
      'drag-over': dragOver,
    }"
    @click="handleRootClick"
  >
    <div
      class="img-container"
      @click="handleImageClick"
    >
      <img
        :src="op.avatar"
        @error="handleImgError"
      />
      <span
        v-if="op.isSelfOperator"
        class="self-tag"
      >
        自选
      </span>
      <!-- 编队槽位在此塞删除按钮与装备角标 -->
      <slot />
    </div>

    <span class="name-label">{{ op.name }}</span>
    <span
      v-if="tier"
      class="tier-tag"
    >
      {{ tier }}
    </span>
  </div>
</template>

<script setup>
  import { handleImgError } from "@/utils/index.js";

  /**
   * 干员卡片：干员池与编队共用的唯一定义。
   *
   * 只负责「长什么样」与「哪里可以点」，不处理悬停浮层、拖拽载荷与装备装配，
   * 这些由父级通过原生事件透传（`<OperatorCard @mouseenter=...>`）挂到根元素上。
   */
  const props = defineProps({
    /** 干员实例：{ name, avatar, isSelfOperator? } */
    op: { type: Object, required: true },
    /** 阶数角标；编队不传，干员池传 */
    tier: { type: String, default: "" },
    /**
     * 点击落点：
     * - `root`：整卡可点（干员池，点名字也能入队）
     * - `image`：只有头像可点（编队，点名字不触发装备选择器）
     * - `none`：不处理
     */
    pickOn: {
      type: String,
      default: "none",
      validator: (value) => ["none", "root", "image"].includes(value),
    },
    /** 该干员不在当前版本的干员池中（切版本后残留） */
    missing: Boolean,
    /** 临时装备池里有装备，提示可以把装备放到这里 */
    dropReady: Boolean,
    /** 装备正拖拽悬停在本卡上 */
    dragOver: Boolean,
  });

  const emit = defineEmits(["pick"]);

  const handleRootClick = () => {
    if (props.pickOn === "root") {
      emit("pick");
    }
  };

  const handleImageClick = () => {
    if (props.pickOn === "image") {
      emit("pick");
    }
  };
</script>

<style scoped>
  /* 干员单元格：全站唯一一处 .op-unit 定义（宽度统一 75px） */
  .op-unit {
    position: relative;
    width: 75px;
    text-align: center;
    cursor: pointer;
  }

  /* 用「直接子元素」限定头像，避免命中装备角标里的小图标 */
  .img-container > img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 4px;
    background: #222;
    display: block;
  }

  .img-container {
    position: relative;
  }

  .name-label {
    font-size: 12px;
    display: block;
    margin-top: 5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .tier-tag {
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.8);
    color: #ffcf00;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 4px 0 4px 0;
  }

  .self-tag {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(255, 207, 0, 0.2);
    color: rgba(255, 240, 180, 0.88);
    font-size: 9px;
    font-weight: 500;
    line-height: 1;
    padding: 2px 3px;
    border: 1px solid rgba(255, 207, 0, 0.28);
    border-radius: 3px;
  }

  /* 跨版本干员：当前版本干员池中不存在 */
  .op-unit.op-missing .img-container > img {
    outline: 2px dashed #ff6b6b;
    outline-offset: -2px;
    filter: grayscale(0.7) brightness(0.75);
  }

  .op-unit.op-missing .name-label {
    color: #ff9a9a;
  }

  /* 临时装备池有货时，头像提示可放置 */
  .op-unit.drop-ready .img-container > img {
    outline: 1px dashed rgba(143, 224, 205, 0.65);
    outline-offset: -1px;
  }

  .op-unit.drag-over .img-container > img {
    outline: 2px solid #8fe0cd;
    outline-offset: -2px;
    box-shadow: 0 0 10px rgba(143, 224, 205, 0.45);
  }

  .op-unit.drag-over .name-label {
    color: #8fe0cd;
  }

  @media (max-width: 768px) {
    .name-label {
      font-size: 11px;
      margin-top: 4px;
    }
  }
</style>
