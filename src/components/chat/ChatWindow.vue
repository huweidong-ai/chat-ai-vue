<template>
  <div class="chat-container">
    <header class="chat-header">
      <div class="header-left">
        <h3>{{ chatHeaderTitle }}</h3>
      </div>
      <div class="header-right">
        <button class="icon-btn" title="复制对话">
          <i class="fas fa-copy"></i>
        </button>
        <button class="icon-btn" title="导出对话">
          <i class="fas fa-download"></i>
        </button>
      </div>
    </header>
    <main class="chat-body">
      <ul class="message-list">
        <li v-for="(msg, index) in messages" :key="index" :class="['message', msg.type]">
          <div class="avatar">
            <img v-if="msg.type === 'AI'" src="@/assets/ai-avatar.png" alt="AI" />
            <span v-else>{{ msg.type === 'Me' ? '我' : (msg.type === 'system' ? '系统' : 'AI') }}</span>
          </div>
          <div class="message-wrapper">
            <div class="message-header">
              <span class="sender-name">{{ msg.type === 'Me' ? '我' : (msg.type === 'system' ? '系统' : 'AI助手') }}</span>
              <span class="message-time">{{ msg.timestamp || '刚刚' }}</span>
            </div>
            <div v-if="msg.type === 'system'" class="message-content system">{{ msg.content }}</div>
            <div v-else v-html="renderMarkdown(msg.content)" class="message-content"></div>
            <div class="message-actions" v-if="msg.type === 'AI'">
              <button class="action-btn" title="复制">
                <i class="fas fa-copy"></i>
              </button>
              <button class="action-btn" title="点赞">
                <i class="fas fa-thumbs-up"></i>
              </button>
              <button class="action-btn" title="点踩">
                <i class="fas fa-thumbs-down"></i>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </main>
    <footer class="chat-footer">
      <div class="tools-section">
        <div class="tools-group">
          <button class="tool-btn" title="深度思考">
            <i class="fas fa-brain"></i>
            深度思考
          </button>
          <button class="tool-btn" title="联网搜索">
            <i class="fas fa-search"></i>
            联网搜索
          </button>
          <button class="tool-btn" title="PPT制作">
            <i class="fas fa-file-powerpoint"></i>
            PPT制作
          </button>
        </div>
      </div>
      <div class="message-input-wrapper">
        <div class="input-tools">
          <button class="tool-btn" @click="uploadFile" title="上传文件">
            <i class="fas fa-paperclip"></i>
          </button>
          <button class="tool-btn" title="插入图片">
            <i class="fas fa-image"></i>
          </button>
        </div>
        <textarea
          v-model="message"
          @keydown.enter.prevent="sendMessageOrStop"
          placeholder="输入消息，Enter 发送，Shift + Enter 换行..."
          class="message-input"
          ref="messageInput"
          @input="autoGrow"
        ></textarea>
        <div class="input-actions">
          <span class="char-count">{{ message.length }}/10000</span>
          <button
            @click="sendMessageOrStop"
            :class="['send-btn', isStreaming ? 'stop' : '']">
            {{ isStreaming ? '停止' : '发送' }}
            <i class="fas" :class="isStreaming ? 'fa-stop' : 'fa-paper-plane'"></i>
          </button>
        </div>
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
  height: 100vh;
}

.chat-header {
  padding: 16px 24px;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  transition: all 0.3s;
}

.icon-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scroll-behavior: smooth;
  background-color: #f9f9f9;
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

.message-wrapper {
  flex: 1;
  margin-left: 12px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.message.Me .message-wrapper {
  background: #e3f2fd;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.sender-name {
  font-weight: 500;
  color: #333;
}

.message-time {
  color: #999;
  font-size: 12px;
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

.message-content.system {
  color: #666;
  font-style: italic;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.action-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.3s;
}

.action-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.tools-section {
  padding: 8px 24px;
  border-top: 1px solid #e6e6e6;
}

.tools-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-btn {
  background: none;
  border: 1px solid #e6e6e6;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  color: #666;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s;
}

.tool-btn:hover {
  background-color: #f5f5f5;
  border-color: #ccc;
}

.tool-btn i {
  font-size: 14px;
}

.message-input-wrapper {
  margin: 16px 24px;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  background: #fff;
}

.input-tools {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid #e6e6e6;
}

.message-input {
  width: 100%;
  min-height: 60px;
  max-height: 200px;
  padding: 12px;
  border: none;
  resize: none;
  outline: none;
  font-size: 14px;
  line-height: 1.6;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-top: 1px solid #e6e6e6;
}

.char-count {
  color: #999;
  font-size: 12px;
}

.send-btn {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.send-btn:hover {
  background-color: #4338ca;
}

.send-btn.stop {
  background-color: #ef4444;
}

.send-btn.stop:hover {
  background-color: #dc2626;
}

.disclaimer {
  padding: 12px 24px;
  color: #666;
  font-size: 12px;
  text-align: center;
  border-top: 1px solid #e6e6e6;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>