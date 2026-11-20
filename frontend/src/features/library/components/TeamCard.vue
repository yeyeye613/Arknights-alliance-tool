<template>
  <div class="saved-team-item">
    <div class="team-preview">
      <span class="team-name">{{ team.name }}</span>
      <div class="team-avatars">
        <img
          v-for="op in previewOperators"
          :key="op.id"
          :src="op.avatar"
          class="preview-avatar"
        />
      </div>
    </div>
    <div class="team-actions">
      <button
        v-if="!editMode"
        type="button"
        class="action-btn load-btn"
        title="加载编队"
        @click="emit('load')"
      >
        加载
      </button>
      <button
        v-if="!editMode"
        type="button"
        class="action-btn share-small-btn"
        title="分享编队"
        @click="emit('share')"
      >
        分享
      </button>
      <button
        v-if="editMode"
        type="button"
        class="action-btn edit-btn"
        title="编辑"
        @click="emit('edit')"
      >
        编辑
      </button>
      <button
        v-if="editMode"
        type="button"
        class="action-btn move-btn"
        title="移动到合集"
        @click="emit('move')"
      >
        移动
      </button>
      <button
        v-if="editMode"
        type="button"
        class="action-btn delete-btn"
        title="删除"
        @click="emit('remove')"
      >
        删除
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";

  /**
   * 已保存编队的一条记录：名字 + 前 9 个头像 + 操作按钮。
   *
   * 合集内与「未归类」两处的条目原本是两段重复模板，只差回调参数；
   * 这里统一成组件，索引由父级在事件里绑定，组件本身不关心原始下标。
   */
  const props = defineProps({
    /** 已保存编队：{ name, team: [{ id, avatar }], version? } */
    team: { type: Object, required: true },
    /** 编辑模式：显示编辑 / 移动 / 删除，隐藏加载 / 分享 */
    editMode: Boolean,
  });

  const emit = defineEmits(["load", "share", "edit", "move", "remove"]);

  /** 头像墙最多 9 个 */
  const previewOperators = computed(() => (props.team.team || []).slice(0, 9));
</script>

<style scoped>
  /* .action-btn 基类与 SavedTeamsPanel 头部按钮各有一份：scoped 样式无法跨文件复用 */
  .action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    transition: 0.2s;
  }

  .share-small-btn {
    background: transparent;
    font-size: 14px;
    padding: 2px 6px;
  }

  .share-small-btn:hover {
    background: #4caf50;
    color: white;
  }

  .saved-team-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #252525;
    border-radius: 4px;
    margin-bottom: 8px;
    transition: 0.2s;
  }

  .saved-team-item:hover {
    background: #2f2f2f;
  }

  .team-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .team-avatars {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
  }

  .preview-avatar {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    background: #333;
    object-fit: cover;
  }

  .team-name {
    font-size: 13px;
    font-weight: 500;
  }

  .team-actions {
    display: flex;
    gap: 6px;
  }

  .load-btn:hover {
    background: #4caf50;
    color: white;
  }

  .edit-btn:hover {
    background: #ff9800;
    color: white;
  }

  .move-btn:hover {
    background: #2196f3;
    color: white;
  }

  .delete-btn:hover {
    background: #f44336;
    color: white;
  }

  @media (max-width: 768px) {
    .saved-team-item {
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 10px;
    }

    .team-preview {
      gap: 8px;
      flex-wrap: wrap;
    }

    .preview-avatar {
      width: 24px;
      height: 24px;
    }

    .team-actions {
      margin-left: auto;
    }
  }
</style>
