<template>
  <div class="conversation-list">
    <h2>对话列表</h2>
    <button @click="navigateToNewChat" class="new-dialog-btn">新建对话</button>
    <ul>
      <li
          v-for="dialog in dialogs"
          :key="dialog.id"
          @click="selectDialog(dialog.id)"
          :class="['dialog-item', selectedDialogId === dialog.id ? 'selected' : '']">
        {{ dialog.title }} - {{ formatDate(dialog.createdAt) }}
      </li>
    </ul>
  </div>
</template>

<script>
import { ref } from 'vue';
import DialogService from '@/services/DialogService';

export default {
  name: 'ConversationList',
  emits: ['select-dialog', 'new-chat'],
  setup(props, { emit }) {
    const dialogs = ref([]);
    const selectedDialogId = ref(null);

    const loadDialogs = () => {
      dialogs.value = DialogService.getAllDialogs();
      if (dialogs.value.length > 0) {
        selectedDialogId.value = dialogs.value[0].id;
        emit('select-dialog', selectedDialogId.value);
      }
    };

    const navigateToNewChat = () => {
      selectedDialogId.value = null;
      emit('new-chat');
    };

    const selectDialog = (id) => {
      if (selectedDialogId.value !== id) {
        selectedDialogId.value = parseInt(id);
        emit('select-dialog', selectedDialogId.value);
      }
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleString();
    };

    loadDialogs();

    return {
      dialogs,
      selectedDialogId,
      navigateToNewChat,
      selectDialog,
      formatDate
    };
  }
};
</script>

<style scoped>
.conversation-list {
  width: 30%;
  padding: 20px;
  border-right: 1px solid #dcdfe6;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.new-dialog-btn {
  margin-bottom: 1rem;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  background-color: #409eff;
  color: white;
  cursor: pointer;
  width: 100%;
  font-size: 14px;
  transition: background-color 0.3s;
}

.new-dialog-btn:hover {
  background-color: #66b1ff;
}

.dialog-item {
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  border: 1px solid #dcdfe6;
  background-color: #fff;
}

.dialog-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.dialog-item.selected {
  background-color: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}
</style>