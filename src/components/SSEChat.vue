<template>
  <div class="chat-container">
    <header class="chat-header">
      <h1>百变AI君</h1>
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

// 定义 Markdown 解析选项
const markedOptions = {
  sanitize: true, // 禁用 HTML 标签，防止 XSS 攻击
  smartypants: true, // 转换常见的 ASCII 字符为更漂亮的 Unicode 等效字符
};

export default {
  name: 'SSEChat',
  mounted() {
    // 设置浏览器标签页名称
    document.title = '百变AI君';
  },
  setup() {
    const message = ref('');
    const messages = ref([]);
    let controller = new AbortController();
    let isConversationFinished = ref(false);
    let currentIncomingMessage = ref(null); // 用于存储当前正在接收的消息
    const messageInput = ref(null);
    let sseId = ref(null); // 存储 SSE ID
    const isStreaming = ref(false); // 用于跟踪是否正在接收流数据

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
      console.log('Attempting to stop the stream...'); // 添加这一行来确认是否进入方法
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
      // 使用 API_CONFIG 中的配置构建完整的 URL
      const url = `${getApiUrl()}/sse/stream/chat`;
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
                // 不需要在这里推送“对话已结束”的消息，因为它不是用户发送的
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
      currentIncomingMessage.value = null;
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
      message,
      messages,
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  background: #f4f7f9; /* 更柔和的背景色 */
}

.chat-header {
  background-color: #4c9aff;
  padding: 16px;
  text-align: center;
  color: white;
  font-weight: bold;
  border-bottom: 2px solid #4090ff; /* 加强头部视觉效果 */
}

.chat-body {
  flex-grow: 1;
  padding: 16px;
  overflow-y: auto;
  background: #fff; /* 白色背景使消息更清晰 */
}

.message-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.message {
  margin-bottom: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1.5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 添加阴影提升立体感 */
  text-align: left; /* 确保普通消息左对齐 */
}

.message.outgoing {
  background-color: #d1e7dd;
  align-self: flex-end;
  color: #333; /* 深色文字提高对比度 */
  text-align: right; /* 确保发出的消息右对齐 */
}

.message.incoming {
  background-color: #e9ecef;
  align-self: flex-start;
  color: #333; /* 深色文字提高对比度 */
  text-align: left; /* 确保接收的消息左对齐 */
}

.message.system {
  background-color: #f8d7da;
  color: #721c24;
  align-self: center;
  text-align: center; /* 系统消息居中对齐 */
  padding: 10px 16px;
  border-radius: 8px;
}

.chat-footer {
  position: relative; /* 使子元素能够相对于它进行绝对定位 */
  padding: 16px;
  background-color: #f8f9fa;
  border-top: 1px solid #ddd;
  display: flex;
  align-items: flex-end; /* 使输入框和按钮在底部对齐 */
}

.message-input {
  flex-grow: 1;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 8px; /* 为发送按钮留出空间 */
  resize: none; /* 禁止用户调整大小 */
  min-height: 70px; /* 设置最小高度为70px */
  max-height: 50vh; /* 设置最大高度为视口高度的一半 */
  overflow-wrap: break-word;
  word-wrap: break-word;
  box-sizing: border-box;
  transition: all 0.2s ease;
  overflow-y: auto; /* 当内容超过最大高度时显示滚动条 */
}

.message-input:focus {
  border-color: #4c9aff;
  outline: none;
  box-shadow: 0 0 5px rgba(76, 154, 255, 0.5); /* 聚焦时的视觉反馈 */
}

/* 固定发送按钮的位置 */
.send-button {
  position: absolute; /* 绝对定位 */
  bottom: 20px; /* 距离聊天框底部16px */
  right: 28px; /* 距离聊天框右侧16px */
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #4c9aff;
  color: white;
}

.send-button:hover {
  background-color: #4090ff;
}

/* 红色停止按钮样式 */
.send-button-red {
  position: absolute; /* 绝对定位 */
  bottom: 20px; /* 距离聊天框底部16px */
  right: 28px; /* 距离聊天框右侧16px */
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: red;
  color: white;
}

.send-button-red:hover {
  background-color: darkred;
}
</style>



