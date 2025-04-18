<template>
  <div class="chat-layout">
    <ChatSidebar
      :chat-history="chatHistory"
      :current-chat-id="currentChatId"
      @new-chat="handleNewChat"
      @select-chat="handleSelectChat"
    />
    <ChatWindow
      :messages="currentMessages"
      :is-streaming="isStreaming"
      @send-message="handleSendMessage"
      @stop-stream="handleStopStream"
      @upload-file="handleUploadFile"
    />
    <LoginModal
      v-if="showLoginModal"
      :visible="showLoginModal"
      @close="closeLoginModal"
      @login-success="handleLoginSuccess"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import ChatSidebar from './ChatSidebar.vue';
import ChatWindow from './ChatWindow.vue';
import LoginModal from '../auth/LoginModal.vue';

export default {
  name: 'ChatLayout',
  components: {
    ChatSidebar,
    ChatWindow,
    LoginModal
  },
  setup() {
    const authStore = useAuthStore();
    const showLoginModal = ref(false);
    const chatHistory = ref([
      {
        id: '1',
        title: '关于Vue3的讨论',
        time: '10:30',
        messages: []
      },
      {
        id: '2',
        title: 'AI助手使用指南',
        time: '昨天',
        messages: []
      }
    ]);

    const currentChatId = ref('1');
    const isStreaming = ref(false);

    const currentMessages = computed(() => {
      const chat = chatHistory.value.find(c => c.id === currentChatId.value);
      return chat ? chat.messages : [];
    });

    // 检查是否需要登录
    const checkAuth = () => {
      if (!authStore.isLoggedIn) {
        showLoginModal.value = true;
        return false;
      }
      return true;
    };

    const handleNewChat = () => {
      if (!checkAuth()) return;

      const newChat = {
        id: String(Date.now()),
        title: '新对话',
        time: '刚刚',
        messages: []
      };
      chatHistory.value.unshift(newChat);
      currentChatId.value = newChat.id;
    };

    const handleSelectChat = (chatId) => {
      if (!checkAuth()) return;
      currentChatId.value = chatId;
    };

    const handleSendMessage = (messageData) => {
      if (!checkAuth()) return;

      const chat = chatHistory.value.find(c => c.id === currentChatId.value);
      if (chat) {
        chat.messages.push({
          type: 'Me',
          content: messageData.content,
          timestamp: new Date().toLocaleTimeString()
        });
        // TODO: 调用API获取AI响应
        isStreaming.value = true;
        setTimeout(() => {
          chat.messages.push({
            type: 'AI',
            content: '这是一个模拟的AI响应',
            timestamp: new Date().toLocaleTimeString()
          });
          isStreaming.value = false;
        }, 1000);
      }
    };

    const handleStopStream = () => {
      if (!checkAuth()) return;
      isStreaming.value = false;
      // TODO: 实现停止流式响应的逻辑
    };

    const handleUploadFile = () => {
      if (!checkAuth()) return;
      // TODO: 实现文件上传逻辑
      console.log('File upload triggered');
    };

    const closeLoginModal = () => {
      showLoginModal.value = false;
    };

    const handleLoginSuccess = () => {
      closeLoginModal();
      // 可以在这里添加登录成功后的其他操作
    };

    onMounted(async () => {
      // 检查是否有保存的登录状态
      await authStore.checkAuth();
    });

    return {
      chatHistory,
      currentChatId,
      currentMessages,
      isStreaming,
      showLoginModal,
      handleNewChat,
      handleSelectChat,
      handleSendMessage,
      handleStopStream,
      handleUploadFile,
      closeLoginModal,
      handleLoginSuccess
    };
  }
};
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background-color: #fff;
}
</style>