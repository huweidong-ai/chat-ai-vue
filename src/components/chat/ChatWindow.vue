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
      <div class="message-input-wrapper">
        <button @click="uploadFile" class="upload-btn" title="支持上传文件(最多 50个，每个 100 MB)接受 pdf、docx、xlsx、pptx、txt、png、jpeg等">+</button>
        <textarea
          v-model="message"
          @keydown.enter.prevent="sendMessageOrStop"
          placeholder="Type a message..."
          class="message-input"
          ref="messageInput"
        ></textarea>
        <button @click="sendMessageOrStop"
                :class="['btn', isStreaming ? 'send-button-red' : 'send-button']">
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

    const autoGrow = () => {
      nextTick(() => {
        if (messageInput.value) {
          messageInput.value.style.height = 'auto';
          messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 200) + 'px';
        }
      });
    };

    const sendMessageOrStop = () => {
      if (props.isStreaming) {
        emit('stop-stream');
      } else if (message.value.trim()) {
        emit('send-message', message.value);
        message.value = '';
        autoGrow();
      }
    };

    const uploadFile = () => {
      emit('upload-file');
    };

    const renderMarkdown = (content) => {
      return renderer.parse(content || '');
    };

    const chatHeaderTitle = computed(() => {
      return props.isStreaming ? 'AI回复中...' : '聊天窗口';
    });

    return {
      message,
      messageInput,
      sendMessageOrStop,
      uploadFile,
      renderMarkdown,
      chatHeaderTitle
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
}

.chat-header {
  background-color: #409eff;
  color: white;
  padding: 12px 20px;
  text-align: center;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 16px;
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
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-top: 20px;
}

.message-input-wrapper {
  position: relative;
  width: 100%;
}

.message-input {
  width: 100%;
  resize: vertical;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  box-sizing: border-box;
  max-height: 300px;
  min-height: 80px;
  font-size: 14px;
  overflow-y: auto;
  margin-bottom: 12px;
  transition: border-color 0.3s;
}

.message-input:focus {
  outline: none;
  border-color: #409eff;
}

.btn {
  position: absolute;
  bottom: 20px;
  right: 12px;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.send-button {
  background-color: #409eff;
  color: white;
}

.send-button:hover {
  background-color: #66b1ff;
}

.send-button-red {
  background-color: #f56c6c;
  color: white;
}

.send-button-red:hover {
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
  bottom: 20px;
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