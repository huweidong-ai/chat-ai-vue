<template>
  <div class="container">
    <div class="conversation-list">
      <h2>对话列表</h2>
      <button @click="navigateToNewChat" class="new-dialog-btn">新建对话</button>
      <ul>
        <li v-for="dialog in dialogs" :key="dialog.id" @click="selectDialog(dialog.id)" :class="['dialog-item', selectedDialogId === dialog.id ? 'selected' : '']">
          {{ dialog.title }} - {{ formatDate(dialog.createdAt) }}
        </li>
      </ul>
    </div>
    <div class="chat-container" v-if="selectedDialog">
      <header class="chat-header">
        <h1>{{ selectedDialog.title }}</h1>
      </header>
      <main class="chat-body">
        <ul class="message-list">
          <li v-for="(msg, index) in selectedDialog.messages" :key="index" :class="['message', msg.type]">
            <span v-if="msg.type === 'system'" class="message-content">{{ msg.content }}</span>
            <span v-else v-html="renderMarkdown(msg.content)" class="message-content"></span>
          </li>
        </ul>
      </main>
      <footer class="chat-footer">
        <textarea
            v-model="message"
            @keydown.enter.prevent="sendMessageOrStop"
            placeholder="Type a message..."
            class="message-input"
            rows="1"
            ref="messageInput"
        ></textarea>

        <button @click="sendMessageOrStop" :class="['btn', isStreaming ? 'send-button-red' : 'send-button']">
          {{ isStreaming ? '停止' : '发送' }}
        </button>
      </footer>
    </div>
    <div class="chat-container empty-chat" v-else>
      <p>请选择一个对话或新建一个对话。</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import API_CONFIG from '@/config/api'; // 导入 API 配置
import { parse as markedParse } from 'marked'; // 导入 marked 解析函数
import DialogService from '@/services/DialogService';

// 定义 Markdown 解析选项
const markedOptions = {
  sanitize: true, // 禁用 HTML 标签，防止 XSS 攻击
  smartypants: true, // 转换常见的 ASCII 字符为更漂亮的 Unicode 等效字符
};

export default {
  name: 'ConversationListAndChat',
  setup() {
    const dialogs = ref([]);
    const selectedDialogId = ref(null);
    const message = ref('');
    let controller = new AbortController();
    let isConversationFinished = ref(false);
    let currentIncomingMessage = ref(null); // 用于存储当前正在接收的消息
    const messageInput = ref(null);
    let sseId = ref(null); // 存储 SSE ID
    const isStreaming = ref(false); // 用于跟踪是否正在接收流数据

    const loadDialogs = () => {
      dialogs.value = DialogService.getAllDialogs();
    };

    const navigateToNewChat = () => {
      // 创建一个新的对话并添加到对话列表中
      const newDialog = DialogService.createDialog();
      dialogs.value.push(newDialog);
      // 选择新创建的对话
      selectedDialogId.value = newDialog.id;
    };

    const selectDialog = (id) => {
      selectedDialogId.value = parseInt(id);
    };

    const autoGrow = () => {
      nextTick(() => {
        if (messageInput.value) {
          // 让 textarea 的高度自动适应内容
          messageInput.value.style.height = 'auto';
          messageInput.value.style.height = messageInput.value.scrollHeight + 'px';
        }
      });
    };

    const sendMessage = () => {
      if (message.value.trim()) {
        autoGrow(); // 确保在发送前更新高度
        // 发送消息到服务器
        const data = { question: message.value, userId: '123' };
        startEventSource(data);
        selectedDialog.value.messages.push({ content: message.value, type: 'outgoing' });
        message.value = ''; // 清空输入框
      }
    };

    const stopStream = () => {
      console.log('Attempting to stop the stream...');
      if (sseId.value) {
        // 调用 stop 接口
        fetch(`${getApiUrl()}/sse/stream/stop/${sseId.value}`, {
          method: 'GET'
        })
            .then(response => response.json())
            .then(data => {
              console.log('Stop response:', data);
              selectedDialog.value.messages.push({ content: '流已停止。', type: 'system' });
              closeConnection();
            })
            .catch(error => {
              console.error('Error stopping stream:', error);
              selectedDialog.value.messages.push({ content: '无法停止流。', type: 'system' });
            });
      } else {
        selectedDialog.value.messages.push({ content: '没有有效的 SSE ID 可以停止流。', type: 'system' });
      }
    };

    const sendMessageOrStop = () => {
      if (isStreaming.value) {
        stopStream();
      } else {
        sendMessage();
      }
    };

    const startEventSource = (data) => {
      if (isStreaming.value) {
        console.warn('Already streaming, ignoring duplicate request.');
        return;
      }

      // 使用 API_CONFIG 中的配置构建完整的 URL
      const url = `${getApiUrl()}/sse/stream/chat`;
      controller = new AbortController(); // 创建一个新的 AbortController 实例
      fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        openWhenHidden: true,
        onopen(response) {
          if (response.ok && response.headers.get("content-type") === "text/event-stream") {
            console.log("Connection made");
            isStreaming.value = true; // 开始接收流数据
          } else {
            throw new Error(`Unexpected response status ${response.status}`);
          }
        },
        onmessage(event) {
          try {
            // 解析服务器返回的 JSON 数据
            const eventData = JSON.parse(event.data);

            if (eventData.code === 200) {
              // 更新 sseId 如果存在
              if (eventData.sseId) {
                sseId.value = eventData.sseId;
              }

              // 如果 currentIncomingMessage 还未初始化，则初始化它
              if (!currentIncomingMessage.value) {
                currentIncomingMessage.value = { content: '', type: 'incoming' };
                selectedDialog.value.messages.push(currentIncomingMessage.value);
              }

              // 追加接收到的部分消息
              currentIncomingMessage.value.content += eventData.answer;

              // 检查是否已经完成对话
              if (eventData.finish) {
                isConversationFinished.value = true;
                isStreaming.value = false; // 停止接收流数据
                currentIncomingMessage.value = null; // 清空当前消息缓冲区
              }
            } else {
              // 如果服务器返回了错误码，处理错误
              selectedDialog.value.messages.push({ content: `Error: ${eventData.msg}`, type: 'system' });
              isStreaming.value = false; // 停止接收流数据
              currentIncomingMessage.value = null;
            }
          } catch (e) {
            console.error('Failed to parse event data:', e);
            selectedDialog.value.messages.push({
              content: '无法解析服务器返回的数据：' + e.message,
              type: 'system'
            });
            isStreaming.value = false; // 停止接收流数据
            currentIncomingMessage.value = null;
          }
        },
        onclose() {
          console.log('Connection closed');
          if (!isConversationFinished.value) {
            selectedDialog.value.messages.push({ content: '连接已关闭。', type: 'system' });
          }
          isStreaming.value = false; // 停止接收流数据
          currentIncomingMessage.value = null; // 清空当前消息缓冲区
        },
        onerror(error) {
          console.error('Error with the event source:', error);
          selectedDialog.value.messages.push({ content: '与服务器的连接发生错误。', type: 'system' });
          isStreaming.value = false; // 停止接收流数据
          currentIncomingMessage.value = null; // 清空当前消息缓冲区
        }
      });
    };

    const closeConnection = () => {
      controller.abort();
      if (selectedDialog.value) {
        selectedDialog.value.messages.push({ content: '连接已手动关闭。', type: 'system' });
      }
      isStreaming.value = false; // 停止接收流数据
      currentIncomingMessage.value = null; // 清空当前消息缓冲区
      sseId.value = null; // 清空 sseId
    };

    const scrollToBottom = () => {
      // 获取消息列表元素
      const messageList = document.querySelector('.message-list');
      if (messageList) {
        // 滚动到底部
        messageList.scrollTop = messageList.scrollHeight;
      }
    };

    const renderMarkdown = (content) => {
      // 使用 marked 解析 Markdown 并返回 HTML 字符串
      return markedParse(content || '', markedOptions);
    };

    const getApiUrl = () => {
      return `${API_CONFIG.domain}`;
    };

    const selectedDialog = ref(null);

    watch(selectedDialogId, (newId) => {
      selectedDialog.value = DialogService.getDialogById(newId);
      scrollToBottom();
    });

    onMounted(() => {
      loadDialogs();
      if (dialogs.value.length > 0) {
        selectedDialogId.value = dialogs.value[0].id; // 默认选择第一个对话
      }
    });

    onUnmounted(() => {
      // 确保在组件卸载时关闭连接
      closeConnection();
    });

    // 在 message 变化时调用 autoGrow
    watch(message, autoGrow);

    const formatDate = (date) => {
      return new Date(date).toLocaleString();
    };

    return {
      dialogs,
      selectedDialogId,
      selectedDialog,
      message,
      sendMessage,
      closeConnection,
      renderMarkdown,
      messageInput,
      stopStream,
      sendMessageOrStop,
      isStreaming,
      navigateToNewChat,
      selectDialog,
      formatDate
    };
  }
};
</script>

<style scoped>
.container {
  display: flex;
  height: calc(100vh - 60px);
}

.conversation-list {
  width: 30%;
  padding: 1rem;
  border-right: 1px solid #ccc;
}

.new-dialog-btn {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
}

.new-dialog-btn:hover {
  background-color: #45a049;
}

.dialog-item {
  padding: 0.5rem;
  border-bottom: 1px solid #ccc;
  cursor: pointer;
}

.dialog-item.selected {
  background-color: #f1f1f1;
}

.chat-container {
  width: 70%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.empty-chat {
  justify-content: center;
  align-items: center;
  color: #888;
}

.chat-header {
  background-color: #4CAF50;
  color: white;
  padding: 1rem;
  text-align: center;
}

.chat-body {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.message {
  margin-bottom: 1rem;
}

.message.outgoing {
  text-align: right;
}

.message.incoming {
  text-align: left;
}

.message-content {
  max-width: 70%;
  padding: 0.5rem;
  border-radius: 1rem;
  background-color: #f1f1f1;
}

.chat-footer {
  display: flex;
  padding: 1rem;
  background-color: #f8f9fa;
}

.message-input {
  flex-grow: 1;
  resize: none;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin-right: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

.send-button {
  background-color: #4CAF50;
  color: white;
}

.send-button:hover {
  background-color: #45a049;
}

.send-button-red {
  background-color: #f44336;
  color: white;
}

.send-button-red:hover {
  background-color: #d32f2f;
}
</style>



