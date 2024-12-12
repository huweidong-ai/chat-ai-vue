<template>
  <div class="chat-container">
    <header class="chat-header">
      <h1>新建对话</h1>
    </header>
    <main class="chat-body">
      <ul class="message-list">
        <li v-for="(msg, index) in messages" :key="index" :class="['message', msg.type]">
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
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import API_CONFIG from '@/config/api'; // 导入 API 配置
import { parse as markedParse } from 'marked'; // 导入 marked 解析函数
import DialogService from '@/services/DialogService';
import { useRouter } from 'vue-router';

// 定义 Markdown 解析选项
const markedOptions = {
  sanitize: true, // 禁用 HTML 标签，防止 XSS 攻击
  smartypants: true, // 转换常见的 ASCII 字符为更漂亮的 Unicode 等效字符
};

export default {
  name: 'NewChat',
  setup() {
    const router = useRouter();
    const messages = ref([]);
    const message = ref('');
    let controller = new AbortController();
    let isConversationFinished = ref(false);
    let currentIncomingMessage = ref(null); // 用于存储当前正在接收的消息
    const messageInput = ref(null);
    let sseId = ref(null); // 存储 SSE ID
    const isStreaming = ref(false); // 用于跟踪是否正在接收流数据
    let newDialogTitle = ref('');

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
        messages.value.push({ content: message.value, type: 'outgoing' });
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
              messages.value.push({ content: '流已停止。', type: 'system' });
              closeConnection();
            })
            .catch(error => {
              console.error('Error stopping stream:', error);
              messages.value.push({ content: '无法停止流。', type: 'system' });
            });
      } else {
        messages.value.push({ content: '没有有效的 SSE ID 可以停止流。', type: 'system' });
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
                messages.value.push(currentIncomingMessage.value);
              }

              // 追加接收到的部分消息
              currentIncomingMessage.value.content += eventData.answer;

              // 检查是否已经完成对话
              if (eventData.finish) {
                isConversationFinished.value = true;
                isStreaming.value = false; // 停止接收流数据
                currentIncomingMessage.value = null; // 清空当前消息缓冲区
                newDialogTitle.value = eventData.answer.split('\n')[0]; // 提取第一行作为对话标题
                createNewDialogWithMessages(messages.value);
              }
            } else {
              // 如果服务器返回了错误码，处理错误
              messages.value.push({ content: `Error: ${eventData.msg}`, type: 'system' });
              isStreaming.value = false; // 停止接收流数据
              currentIncomingMessage.value = null;
            }
          } catch (e) {
            console.error('Failed to parse event data:', e);
            messages.value.push({
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
            messages.value.push({ content: '连接已关闭。', type: 'system' });
          }
          isStreaming.value = false; // 停止接收流数据
          currentIncomingMessage.value = null; // 清空当前消息缓冲区
        },
        onerror(error) {
          console.error('Error with the event source:', error);
          messages.value.push({ content: '与服务器的连接发生错误。', type: 'system' });
          isStreaming.value = false; // 停止接收流数据
          currentIncomingMessage.value = null; // 清空当前消息缓冲区
        }
      });
    };

    const closeConnection = () => {
      controller.abort();
      messages.value.push({ content: '连接已手动关闭。', type: 'system' });
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

    const createNewDialogWithMessages = (messages) => {
      DialogService.addDialog(newDialogTitle.value, messages);
      router.push({ name: 'ConversationListAndChat' });
    };

    onMounted(() => {
      autoGrow();
      // 自动滚动到底部
      scrollToBottom();
    });

    onUnmounted(() => {
      // 确保在组件卸载时关闭连接
      closeConnection();
    });

    // 在 message 变化时调用 autoGrow
    watch(message, autoGrow);

    return {
      messages,
      message,
      sendMessage,
      closeConnection,
      renderMarkdown,
      messageInput,
      stopStream,
      sendMessageOrStop,
      isStreaming
    };
  }
};
</script>

<style scoped>
.chat-container {
  width: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
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



