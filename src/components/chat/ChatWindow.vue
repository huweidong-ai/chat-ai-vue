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
      try {
        if (content === null || content === undefined) {
          console.error('Content is null or undefined');
          return '';
        }
        if (typeof content === 'object' && content.content) {
          content = content.content;
        }
        const strContent = typeof content === 'object' ? JSON.stringify(content) : String(content);
        // 添加内容长度限制，防止堆栈溢出
        if (strContent.length > 50000) {
          console.warn('Content too long, truncating...');
          return `${strContent.substring(0, 50000)}... (内容过长已截断)`;
        }
        // 预处理内容，移除可能导致解析问题的特殊字符
        const sanitizedContent = strContent
          .replace(/^\s*[#\-*]\s*$/gm, '') // 移除只包含标记符号的空行
          .replace(/([\r\n])\1{3,}/g, '$1$1'); // 限制连续换行
        return renderer.parse(sanitizedContent);
      } catch (error) {
        console.error('Markdown rendering error:', error);
        return '内容渲染失败，请查看原始文本';
      }
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
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  position: relative;
}

.chat-header {
  padding: 16px 24px;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  position: sticky;
  top: 0;
  z-index: 5;
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scroll-behavior: smooth;
}

.message-list {
  list-style: none;
  padding: 0;
  max-width: 900px;
  margin: 0 auto;
}

.message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 14px;
  font-weight: 500;
}

.message.Me .avatar {
  background-color: #10b981;
}

.message.system .avatar {
  background-color: #6b7280;
}

.message-content {
  flex: 1;
  padding: 16px;
  background-color: #f3f4f6;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message.Me .message-content {
  background-color: #ede9fe;
  color: #5b21b6;
}

.chat-footer {
  padding: 20px 24px;
  background-color: #fff;
  border-top: 1px solid #e6e6e6;
  position: sticky;
  bottom: 0;
  z-index: 5;
}

.function-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.function-btn {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #fff;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.function-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  transform: translateY(-1px);
}

.message-input-wrapper {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  resize: none;
  min-height: 48px;
  max-height: 200px;
  font-size: 14px;
  line-height: 1.6;
  transition: all 0.2s ease;
  background-color: #f9fafb;
}

.message-input:focus {
  outline: none;
  border-color: #6366f1;
  background-color: #fff;
}

.upload-btn {
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  background-color: #fff;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 18px;
  line-height: 1;
  height: 48px;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  transform: translateY(-1px);
}

.send-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background-color: #6366f1;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  height: 48px;
  min-width: 100px;
}

.send-btn:hover {
  background-color: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.disclaimer {
  margin-top: 16px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
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