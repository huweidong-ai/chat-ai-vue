<template>
  <div class="container">
    <ChatTopicList
      :topics="topics"
      :selectedTopicId="selectedTopicId"
      @select-topic="selectTopic"
      @new-chat="navigateToNewChat"
    />
    <ChatWindow
      :messages="messagesToShow"
      :isStreaming="isCurrentTopicStreaming"
      @send-message="handleSendMessage"
      @stop-stream="stopStream"
      @upload-file="handleUploadFile"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import topicService from '@/services/topicService';
import { chatService } from '@/services/chatService';
import ChatTopicList from './ChatTopicList.vue';
import ChatWindow from './ChatWindow.vue';

export default {
  name: 'ChatLayout',
  components: {
    ChatTopicList,
    ChatWindow
  },
  setup() {
    const topics = ref([]);
    const selectedTopicId = ref(null);
    const selectedTopic = ref(null);
    const controllersMap = ref({});
    const incomingMessagesMap = ref({});
    const sseIdsMap = ref({});
    const isStreamingMap = ref({});

    const loadTopics = () => {
      topics.value = topicService.getAllTopics();
      if (topics.value.length > 0) {
        selectedTopicId.value = topics.value[0].id;
      }
    };

    const navigateToNewChat = () => {
      selectedTopicId.value = null;
    };

    const selectTopic = (id) => {
      if (selectedTopicId.value !== id) {
        selectedTopicId.value = parseInt(id);
      }
    };

    const handleSendMessage = (messageText) => {
      if (!selectedTopicId.value) {
        if (typeof messageText !== 'string') {
          messageText = messageText.content;
        }
        let newTopicTitle = messageText.substring(0, 20);
        if (newTopicTitle.length < messageText.length) {
          newTopicTitle += '...';
        }

        const newTopic = topicService.createTopic(newTopicTitle, [{ content: messageText, type: 'Me' }]);
        topics.value.unshift(newTopic);
        selectedTopicId.value = newTopic.id;
    
        const data = { question: messageText, userId: '123' };
        console.log('新对话发送数据:', data);
        startEventSource(data);
    
        addMessage({ content: messageText, type: 'Me' });
      } else {
        addMessage({ content: messageText, type: 'Me' });
        const data = { question: messageText, userId: '123' };
        console.log('已有对话发送数据:', data);
        startEventSource(data);
      }
    };

    const startEventSource = (data) => {
      const topicId = selectedTopicId.value;
      if (getTopicIsStreaming(topicId)) {
        console.warn('已经在进行对话流，忽略重复请求。');
        return;
      }
    
      console.log('开始SSE连接，发送数据:', data);
      const controller = new AbortController();
      controllersMap.value[topicId] = controller;
    
      chatService.startChatStream(data, {
        onopen(response) {
          if (response.ok && response.headers.get("content-type") === "text/event-stream") {
            setTopicIsStreaming(topicId, true);
          }
        },
    
        onmessage(event) {
          try {
            const eventData = JSON.parse(event.data);
            if (eventData.code === 200) {
              if (eventData.sseId) {
                setTopicSseId(topicId, eventData.sseId);
              }
              let currentIncomingMessage = getTopicIncomingMessage(topicId);
              if (!currentIncomingMessage) {
                currentIncomingMessage = { content: '', type: 'AI' };
                addMessage(currentIncomingMessage);
                setTopicIncomingMessage(topicId, currentIncomingMessage);
              }
              currentIncomingMessage.content += eventData.answer;
              if (eventData.finish) {
                setTopicIsStreaming(topicId, false);
                setTopicIncomingMessage(topicId, null);
              }
            } else {
              addSystemMessage(`错误: ${eventData.msg}`);
              closeConnection(topicId);
            }
          } catch (e) {
            console.error('解析事件数据失败:', e);
            addSystemMessage('无法解析服务器返回的数据：' + e.message);
            closeConnection(topicId);
          }
        },
    
        onclose() {
          if (getTopicIsStreaming(topicId)) {
            addSystemMessage('连接已关闭');
            closeConnection(topicId);
          }
        },
    
        onerror(error) {
          console.error('连接发生错误:', error);
          if (error.message === '未授权，请重新登录') {
            addSystemMessage('登录已过期，请重新登录');
          } else {
            addSystemMessage('连接发生错误，请稍后重试');
          }
          closeConnection(topicId);
        },
    
        signal: controller.signal
      });
    };

    const stopStream = () => {
      const currentSSEId = getTopicSseId(selectedTopicId.value);
      if (currentSSEId) {
        chatService.stopChatStream(currentSSEId)
          .then(() => {
            addSystemMessage('流已停止。');
            closeConnection(selectedTopicId.value);
          })
          .catch(error => {
            console.error('Error stopping stream:', error);
            addSystemMessage('无法停止流。');
          });
      } else {
        addSystemMessage('没有有效的 SSE ID 可以停止流。');
      }
    };

    const handleUploadFile = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('isPreview', false);

          fetch(`/uploadTopicueFile`, {
            method: 'POST',
            body: formData
          })
            .then(response => response.json())
            .then(data => {
              console.log('Upload success:', data);
            })
            .catch(error => {
              console.error('Upload error:', error);
              addSystemMessage('文件上传失败。');
            });
        }
      };
      input.click();
    };

    const closeConnection = (topicId) => {
      const controller = controllersMap.value[topicId];
      if (controller) {
        controller.abort();
      }
      delete controllersMap.value[topicId];
      delete incomingMessagesMap.value[topicId];
      delete sseIdsMap.value[topicId];
      delete isStreamingMap.value[topicId];
    };

    const setTopicIsStreaming = (topicId, isStreaming) => {
      isStreamingMap.value[topicId] = isStreaming;
    };

    const getTopicIsStreaming = (topicId) => {
      return isStreamingMap.value[topicId] || false;
    };

    const setTopicSseId = (topicId, sseId) => {
      sseIdsMap.value[topicId] = sseId;
    };

    const getTopicSseId = (topicId) => {
      return sseIdsMap.value[topicId] || null;
    };

    const setTopicIncomingMessage = (topicId, message) => {
      incomingMessagesMap.value[topicId] = message;
    };

    const getTopicIncomingMessage = (topicId) => {
      return incomingMessagesMap.value[topicId] || null;
    };

    const addMessage = (message) => {
      if (selectedTopic.value) {
        selectedTopic.value.messages.push(message);
      }
    };

    const addSystemMessage = (content) => {
      addMessage({ content, type: 'system' });
    };

    const isCurrentTopicStreaming = computed(() => {
      return getTopicIsStreaming(selectedTopicId.value);
    });

    const messagesToShow = computed(() => {
      return selectedTopic.value ? selectedTopic.value.messages : [];
    });

    watch(selectedTopicId, (newId) => {
      if (newId !== null) {
        selectedTopic.value = topicService.getTopicById(newId);
      } else {
        selectedTopic.value = null;
      }
    });

    onMounted(() => {
      loadTopics();
    });

    onUnmounted(() => {
      Object.keys(controllersMap.value).forEach((topicId) => {
        closeConnection(topicId);
      });
    });

    return {
      topics,
      selectedTopicId,
      messagesToShow,
      isCurrentTopicStreaming,
      selectTopic,
      navigateToNewChat,
      handleSendMessage,
      stopStream,
      handleUploadFile
    };
  }
};
</script>

<style scoped>
.container {
  display: flex;
  height: calc(100vh - 60px);
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  margin: 20px;
}
</style>