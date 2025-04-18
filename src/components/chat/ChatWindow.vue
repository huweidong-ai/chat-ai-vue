<template>
  <div class="chat-container">
    <header class="chat-header">
      <h3>{{ chatHeaderTitle }}</h3>
    </header>
    <main class="chat-body">
      <ul class="message-list">
        <li v-for="(msg, index) in messages" :key="index" :class="['message', msg.type]">
          <div class="avatar">
            <span>{{ msg.type === 'Me' ? '我' : (msg.type === 'system' ? '系统' : 'AI') }}</span>
          </div>
          <span v-if="msg.type === 'system'" class="message-content">{{ msg.content }}</span>
          <span v-else v-html="renderMarkdown(msg.content)" class="message-content"></span>
        </li>
      </ul>
    </main>
    <footer class="chat-footer">
      <div class="function-buttons">
        <button 
          @click="toggleDeepThinking" 
          :class="['function-btn', isDeepThinking ? 'active' : '']">
          <i class="fas fa-brain"></i>
          深度思考
        </button>
        <button 
          @click="toggleWebSearch" 
          :class="['function-btn', isWebSearch ? 'active' : '']">
          <i class="fas fa-search"></i>
          联网搜索
        </button>
      </div>
      <div class="message-input-wrapper">
        <textarea
          v-model="message"
          @keydown.enter.prevent="sendMessageOrStop"
          placeholder="输入消息..."
          class="message-input"
          ref="messageInput"
          @input="autoGrow"
        ></textarea>
        <button @click="uploadFile" class="upload-btn" title="支持上传文件(最多 50个，每个 100 MB)接受 pdf、docx、xlsx、pptx、txt、png、jpeg等">+</button>
        <button 
          @click="sendMessageOrStop"
          :class="['send-btn', isStreaming ? 'stop' : '']">
          {{ isStreaming ? '停止' : '发送' }}
        </button>
      </div>
      <div class="disclaimer">
        所有产出内容均源自人工智能模型，其内容的精确度和全面性不能确保，不反映我们的立场或看法。
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, nextTick, computed } from 'vue';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import plaintext from 'highlight.js/lib/languages/plaintext';
import 'highlight.js/styles/atom-one-dark.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

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
      return hljs.highlight(code, { language }).value;
    }
  })
);

export default {
  name: 'ChatWindow',
  props: {
    messages: {
      type: Array,
      required: true
    },
    isStreaming: {
      type: Boolean,
      default: false
    }
  },
  emits: ['send-message', 'stop-stream', 'upload-file'],
  setup(props, { emit }) {
    const message = ref('');
    const messageInput = ref(null);
    const isDeepThinking = ref(false);
    const isWebSearch = ref(false);

    const autoGrow = () => {
      nextTick(() => {
        if (messageInput.value) {
          messageInput.value.style.height = 'auto';
          messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 200) + 'px';
        }
      });
    };

    const toggleDeepThinking = () => {
      isDeepThinking.value = !isDeepThinking.value;
    };

    const toggleWebSearch = () => {
      isWebSearch.value = !isWebSearch.value;
    };

    const sendMessageOrStop = () => {
      if (props.isStreaming) {
        emit('stop-stream');
      } else if (message.value.trim()) {
        console.log('输入框内容类型:', typeof message.value);
        console.log('输入框内容:', message.value);
        const messageData = {
          content: message.value,
          mode: isDeepThinking.value ? 'deep_thinking' : (isWebSearch.value ? 'web_search' : 'normal')
        };
        console.log('发送的消息数据:', messageData);
        emit('send-message', messageData);
        message.value = '';
        autoGrow();
      }
    };

    const uploadFile = () => {
      emit('upload-file');
    };

    const renderMarkdown = (content) => {
      if (content === null || content === undefined) {
        console.error('Content is null or undefined');
        return '';
      }
      if (typeof content === 'object' && content.content) {
        content = content.content;
      }
      const strContent = typeof content === 'object' ? JSON.stringify(content) : String(content);
      return renderer.parse(strContent);
    };

    const chatHeaderTitle = computed(() => {
      return props.isStreaming ? 'AI回复中...' : '聊天窗口';
    });

    const clearMessage = () => {
      message.value = '';
      autoGrow();
    };

    return {
      message,
      messageInput,
      isDeepThinking,
      isWebSearch,
      toggleDeepThinking,
      toggleWebSearch,
      sendMessageOrStop,
      uploadFile,
      renderMarkdown,
      chatHeaderTitle,
      autoGrow,
      clearMessage
    };
  }
};
</script>

<style scoped>
.chat-container {
  width: 70%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.chat-header {
  background-color: #007BFF;
  color: white;
  padding: 12px 20px;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-body {
  flex-grow: 1;
  min-height: 200px;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.message-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.message {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  font-size: 14px;
  margin-right: 12px;
}

.message-content {
  max-width: 70%;
  padding: 12px;
  border-radius: 4px;
  background-color: #ecf5ff;
  text-align: left;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-line;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  line-height: 1.5;
  color: #303133;
}

.chat-footer {
  margin-top: 20px;
}

.function-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.function-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 20px;
  background: white;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: bold;
}

.function-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.function-btn.active {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.message-input-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: white;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  min-height: 120px;
}

.message-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  min-height: 24px;
  max-height: 200px;
  font-size: 14px;
  line-height: 1.5;
  padding: 4px 0;
  margin-bottom: 30px;
}

.upload-btn {
  padding: 6px 12px;
  border: none;
  background-color: #409eff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.upload-btn:hover {
  background-color: #66b1ff;
}

.tool-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.tool-btn:hover {
  color: #409eff;
}

.send-btn {
  position: absolute;
  right: 12px;
  bottom: 10px;
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background-color: #409eff;
  color: white;
  transition: all 0.3s;
}

.send-btn:hover {
  background-color: #66b1ff;
}

.send-btn.stop {
  background-color: #f56c6c;
}

.send-btn.stop:hover {
  background-color: #f78989;
}

.disclaimer {
  margin-top: 16px;
  font-size: 12px;
  color: #909399;
  text-align: center;
  line-height: 1.4;
}

.upload-btn {
  position: absolute;
  left: 12px;
  bottom: 10px;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  background-color: #409eff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.upload-btn:hover {
  background-color: #66b1ff;
}
</style>