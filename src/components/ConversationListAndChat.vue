<template>
  <div class="container">
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
    <div class="chat-container">
      <header class="chat-header">
        <h3>{{ chatHeaderTitle }}</h3>
      </header>
      <main class="chat-body">
        <ul class="message-list">
          <li v-for="(msg, index) in messagesToShow" :key="index" :class="['message', msg.type]">
            <div class="avatar">
              <span>{{ msg.type === 'Me' ? '我' : (msg.type === 'system' ? '系统' : 'AI') }}</span>
            </div>
            <span v-if="msg.type === 'system'" class="message-content">{{ msg.content }}</span>
            <span v-else v-html="renderMarkdown(msg.content)" class="message-content"></span>
          </li>
        </ul>
      </main>
      <footer class="chat-footer">
        <div class="message-input-wrapper">
          <textarea
              v-model="message"
              @keydown.enter.prevent="sendMessageOrStop"
              placeholder="Type a message..."
              class="message-input"
              ref="messageInput"
          ></textarea>
          <button @click="sendMessageOrStop"
                  :class="['btn', isCurrentDialogStreaming ? 'send-button-red' : 'send-button']">
            {{ isCurrentDialogStreaming ? '停止' : '发送' }}
          </button>
        </div>
        <div class="disclaimer">
          所有产出内容均源自人工智能模型，其内容的精确度和全面性不能确保，不反映我们的立场或看法。
        </div>
      </footer>
    </div>
  </div>
</template>

<script>
import {ref, onMounted, nextTick, watch, computed, onUnmounted} from 'vue';
import {fetchEventSource} from '@microsoft/fetch-event-source';
import API_CONFIG from '@/config/api'; // 导入 API 配置
import DialogService from '@/services/DialogService';
import {Marked} from 'marked'; // 导入 Marked 类
import {markedHighlight} from "marked-highlight"; // 导入 markedHighlight 插件
import hljs from 'highlight.js/lib/core'; // 引入核心模块
import javascript from 'highlight.js/lib/languages/javascript'; // 引入你需要的语言
import python from 'highlight.js/lib/languages/python'; // 示例：引入 Python 语言
import java from 'highlight.js/lib/languages/java'; // 示例：引入 Java 语言
import shell from 'highlight.js/lib/languages/shell'; // 示例：引入 Shell 语言
import sql from 'highlight.js/lib/languages/sql'; // 示例：引入 SQL 语言
import plaintext from 'highlight.js/lib/languages/plaintext'; // 引入纯文本语言
import 'highlight.js/styles/atom-one-dark.css'; // 引入默认样式

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('plaintext', plaintext);

const renderer = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, {language}).value;
      }
    })
);

export default {
  name: 'ConversationListAndChat',
  setup() {
    const dialogs = ref([]);
    const selectedDialogId = ref(null);
    const message = ref('');
    const messageInput = ref(null);

    const loadDialogs = () => {
      dialogs.value = DialogService.getAllDialogs();
      if (dialogs.value.length > 0) {
        selectedDialogId.value = dialogs.value[0].id; // 默认选择第一个对话
      }
    };

    const navigateToNewChat = () => {
      // 清空当前对话内容
      message.value = '';
      selectedDialogId.value = null;
    };

    const selectDialog = (id) => {
      if (selectedDialogId.value !== id) {
        // 不再立即关闭当前对话的连接
      }
      selectedDialogId.value = parseInt(id);
    };

    const autoGrow = () => {
      nextTick(() => {
        if (messageInput.value) {
          // 让 textarea 的高度自动适应内容
          messageInput.value.style.height = 'auto';
          messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 200) + 'px'; // 设置最大高度为200px
        }
      });
    };

    const sendMessage = () => {
      if (message.value.trim()) {
        autoGrow(); // 确保在发送前更新高度

        if (!selectedDialogId.value) {
          // 如果没有选中的对话，则创建新的对话并添加到对话列表中
          let newDialogTitle = message.value.substring(0, 20); // 截取前20个字符作为标题
          if (newDialogTitle.length < message.value.length) {
            newDialogTitle += '...'; // 添加省略号
          }

          const newDialog = DialogService.createDialog(newDialogTitle);
          dialogs.value.unshift(newDialog); // 将新对话添加到列表开头
          selectedDialogId.value = newDialog.id;

          // 发送消息到服务器
          const data = {question: message.value, userId: '123'};
          startEventSource(data);

          addMessage({content: message.value, type: 'Me'});
          message.value = ''; // 清空输入框
        } else {
          // 如果已有选中的对话，则在该对话中添加消息
          addMessage({content: message.value, type: 'Me'});

          // 发送消息到服务器
          const data = {question: message.value, userId: '123'};
          startEventSource(data);

          message.value = ''; // 清空输入框
        }
      }
    };

    const stopStream = () => {
      console.log('Attempting to stop the stream...');
      const currentSSEId = getDialogSseId(selectedDialogId.value);
      if (currentSSEId) {
        // 调用 stop 接口
        fetch(`${getApiUrl()}/sse/stream/stop/${currentSSEId}`, {
          method: 'GET'
        })
            .then(response => response.json())
            .then(data => {
              console.log('Stop response:', data);
              addSystemMessage('流已停止。');
              closeConnection(selectedDialogId.value);
            })
            .catch(error => {
              console.error('Error stopping stream:', error);
              addSystemMessage('无法停止流。');
            });
      } else {
        addSystemMessage('没有有效的 SSE ID 可以停止流。');
      }
    };

    const sendMessageOrStop = () => {
      if (isCurrentDialogStreaming.value) {
        stopStream();
      } else {
        sendMessage();
      }
    };

    const controllersMap = ref({});
    const incomingMessagesMap = ref({});
    const sseIdsMap = ref({});
    const isStreamingMap = ref({});

    const startEventSource = (data) => {
      const dialogId = selectedDialogId.value;
      if (getDialogIsStreaming(dialogId)) {
        console.warn('Already streaming, ignoring duplicate request.');
        return;
      }

      // 使用 API_CONFIG 中的配置构建完整的 URL
      const url = `${getApiUrl()}/sse/stream/chat`;
      const controller = new AbortController(); // 用于中断请求
      controllersMap.value[dialogId] = controller;

      fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        openWhenHidden: true, // 有时在页面切换或隐藏后再显示时，可能会导致重复请求。可以通过设置openWhenHidden为true来避免这种情况‌

        onopen(response) {
          if (response.ok && response.headers.get("content-type") === "text/event-stream") {
            console.log('连接已打开');
            setDialogIsStreaming(dialogId, true); // 开始接收流数据
          } else {
            throw new Error(`Unexpected response status ${response.status}`);
          }
        },

        onmessage(event) {
          console.log('收到消息');
          try {
            // 解析服务器返回的 JSON 数据
            const eventData = JSON.parse(event.data);
            if (eventData.code === 200) {
              // 更新 sseId 如果存在
              if (eventData.sseId) {
                setDialogSseId(dialogId, eventData.sseId);
              }
              // 如果 currentIncomingMessage 还未初始化，则初始化它
              let currentIncomingMessage = getDialogIncomingMessage(dialogId);
              if (!currentIncomingMessage) {
                currentIncomingMessage = {content: '', type: 'AI'};
                addMessage(currentIncomingMessage);
                setDialogIncomingMessage(dialogId, currentIncomingMessage);
              }
              // 追加接收到的部分消息
              currentIncomingMessage.content += eventData.answer;
              // 检查是否已经完成对话
              if (eventData.finish) {
                setDialogIsStreaming(dialogId, false); // 停止接收流数据
                setDialogIncomingMessage(dialogId, null); // 清空当前消息缓冲区
              }
            } else {
              // 如果服务器返回了错误码，处理错误
              addSystemMessage(`Error: ${eventData.msg}`);
              setDialogIsStreaming(dialogId, false); // 停止接收流数据
              setDialogIncomingMessage(dialogId, null);
            }
          } catch (e) {
            console.error('Failed to parse event data:', e);
            addSystemMessage('无法解析服务器返回的数据：' + e.message);
            setDialogIsStreaming(dialogId, false); // 停止接收流数据
            setDialogIncomingMessage(dialogId, null);
          }
        },

        onclose() {
          console.log('连接已关闭');
          if (!getDialogIsStreaming(dialogId)) {
            addSystemMessage('连接已关闭。');
          }
          setDialogIsStreaming(dialogId, false); // 停止接收流数据
          setDialogIncomingMessage(dialogId, null); // 清空当前消息缓冲区
        },

        onerror() {
          console.error('连接发生错误');
          controller.abort(); // 中断请求
          addSystemMessage('连接发生错误。');
          setDialogIsStreaming(dialogId, false); // 停止接收流数据
          setDialogIncomingMessage(dialogId, null); // 清空当前消息缓冲区
          throw new Error("请求失败，停止重试");
        }
      });
    };

    const closeConnection = (dialogId) => {
      const controller = controllersMap.value[dialogId];
      if (controller) {
        controller.abort();
      }
      delete controllersMap.value[dialogId]; // 删除控制器映射
      delete incomingMessagesMap.value[dialogId]; // 删除当前消息映射
      delete sseIdsMap.value[dialogId]; // 删除 SSE ID 映射
      delete isStreamingMap.value[dialogId]; // 删除流状态映射
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
      // 使用自定义的 renderer 解析 Markdown 并返回 HTML 字符串
      return renderer.parse(content || '');
    };

    const getApiUrl = () => {
      return `${API_CONFIG.domain}`;
    };

    const selectedDialog = ref(null);

    const setDialogIsStreaming = (dialogId, isStreaming) => {
      isStreamingMap.value[dialogId] = isStreaming;
    };

    const getDialogIsStreaming = (dialogId) => {
      return isStreamingMap.value[dialogId] || false;
    };

    const setDialogSseId = (dialogId, sseId) => {
      sseIdsMap.value[dialogId] = sseId;
    };

    const getDialogSseId = (dialogId) => {
      return sseIdsMap.value[dialogId] || null;
    };

    const setDialogIncomingMessage = (dialogId, message) => {
      incomingMessagesMap.value[dialogId] = message;
    };

    const getDialogIncomingMessage = (dialogId) => {
      return incomingMessagesMap.value[dialogId] || null;
    };

    const isCurrentDialogStreaming = computed(() => {
      return getDialogIsStreaming(selectedDialogId.value);
    });

    watch(selectedDialogId, (newId) => {
      if (newId !== null) {
        selectedDialog.value = DialogService.getDialogById(newId);
        scrollToBottom();
      } else {
        selectedDialog.value = null;
      }
    });

    const chatHeaderTitle = computed(() => {
      if (isCurrentDialogStreaming.value) {
        return 'AI回复中...';
      }
      return '聊天窗口';
    });

    const messagesToShow = computed(() => {
      return selectedDialog.value ? selectedDialog.value.messages : [];
    });

    const addMessage = (message) => {
      if (selectedDialog.value) {
        selectedDialog.value.messages.push(message);
        scrollToBottom(); // 确保每次添加消息后滚动到底部
      }
    };

    const addSystemMessage = (content) => {
      addMessage({content, type: 'system'});
    };

    onMounted(() => {
      loadDialogs();
    });

    onUnmounted(() => {
      // 确保在组件卸载时关闭所有连接
      Object.keys(controllersMap.value).forEach((dialogId) => {
        closeConnection(dialogId);
      });
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
      isCurrentDialogStreaming,
      navigateToNewChat,
      selectDialog,
      formatDate,
      chatHeaderTitle,
      messagesToShow
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
  overflow-y: auto;
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
  padding: 0.75rem 1rem;
  text-align: center;
}

.chat-body {
  flex-grow: 1;
  min-height: 100px; /* 设置最小高度 */
  max-height: 500px; /* 设置最大高度 */
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
  display: flex;
  align-items: flex-start;
}

.message.Me {
  justify-content: flex-end;
}

.message.AI {
  justify-content: flex-start;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #ddd;
  color: #555;
  font-size: 14px;
  margin-right: 1rem;
}

.message-content {
  max-width: 70%;
  padding: 0.5rem;
  border-radius: 1rem;
  background-color: #f1f1f1;
  text-align: left; /* 确保内容左对齐 */
}

.chat-footer {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: #f8f9fa;
}

.message-input-wrapper {
  position: relative;
  width: 100%;
}

.message-input {
  width: 100%;
  resize: vertical;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-sizing: border-box;
  max-height: 200px; /* 设置最大高度为200px */
  min-height: 70px;
  font-size: 16px; /* 增大输入文字大小 */
  overflow-y: auto;
}

.btn {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
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

.disclaimer {
  margin-top: 1rem;
  font-size: 12px;
  color: #888;
  text-align: center;
}
</style>



