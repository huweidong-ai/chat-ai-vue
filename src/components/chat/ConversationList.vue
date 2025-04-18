<template>
  <div class="conversation-list">
    <h2>主题列表</h2>
    <button @click="navigateToNewChat" class="new-topic-btn">新建对话</button>
    <ul>
      <li
          v-for="topic in topics"
          :key="topic.id"
          @click="selectDialog(topic.id)"
          :class="['topic-item', selectedDialogId === topic.id ? 'selected' : '']">
        {{ topic.title }} - {{ formatDate(topic.createdAt) }}
      </li>
    </ul>
  </div>
</template>

<script>
import { ref } from 'vue';
import topicService from '@/services/topicService';

export default {
  name: 'ConversationList',
  emits: ['select-topic', 'new-chat'],
  setup(props, { emit }) {
    const topics = ref([]);
    const selectedDialogId = ref(null);

    const loadTopics = () => {
      topics.value = topicService.getAllTopics();
      if (topics.value.length > 0) {
        selectedDialogId.value = topics.value[0].id;
        emit('select-topic', selectedDialogId.value);
      }
    };

    const navigateToNewChat = () => {
      selectedDialogId.value = null;
      emit('new-chat');
    };

    const selectDialog = (id) => {
      if (selectedDialogId.value !== id) {
        selectedDialogId.value = parseInt(id);
        emit('select-topic', selectedDialogId.value);
      }
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleString();
    };

    loadTopics();

    return {
      topics,
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

.new-topic-btn {
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

.new-topic-btn:hover {
  background-color: #66b1ff;
}

.topic-item {
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  border: 1px solid #dcdfe6;
  background-color: #fff;
}

.topic-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.topic-item.selected {
  background-color: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}
</style>