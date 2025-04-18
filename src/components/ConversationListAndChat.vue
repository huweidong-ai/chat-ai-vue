<template>
  <div class="container">
    <ConversationList
      :dialogs="dialogs"
      :selectedDialogId="selectedDialogId"
      @select-dialog="selectDialog"
      @new-chat="navigateToNewChat"
    />
    <ChatWindow
      :messages="messagesToShow"
      :isStreaming="isCurrentDialogStreaming"
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
import ConversationList from './chat/ConversationList.vue';
import ChatWindow from './chat/ChatWindow.vue';

export default {
  name: 'ConversationListAndChat',
  components: {
    ConversationList,
    ChatWindow
  },
  setup() {
    const dialogs = ref([]);
    const selectedDialogId = ref(null);
    const selectedDialog = ref(null);
    const controllersMap = ref({});
    const incomingMessagesMap = ref({});
    const sseIdsMap = ref({});
    const isStreamingMap = ref({});

    const loadTopics = () => {
      dialogs.value = topicService.getAllTopics();
      if (dialogs.value.length > 0) {
        selectedDialogId.value = dialogs.value[0].id;
      }
    };

    const navigateToNewChat = () => {
      selectedDialogId.value = null;
    };

    const selectDialog = (id) => {
      if (selectedDialogId.value !== id) {
        selectedDialogId.value = parseInt(id);
      }
    };

    const handleSendMessage = (messageText) => {
      if (!selectedDialogId.value) {
        if (typeof messageText !== 'string') {
          messageText = messageText.content;
        }
        let newTopicTitle = messageText.substring(0, 20);
        if (newTopicTitle.length < messageText.length) {
          newTopicTitle += '...';
        }

        const newTopic = topicService.createTopic(newTopicTitle, [{ content: messageText, type: 'Me' }]);
        dialogs.value.unshift(newTopic);
        selectedDialogId.value = newTopic.id;
    
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
      const dialogId = selectedDialogId.value;
      if (getDialogIsStreaming(dialogId)) {
        console.warn('已经在进行对话流，忽略重复请求。');
        return;
      }
    
      console.log('开始SSE连接，发送数据:', data);
      const controller = new AbortController();
      controllersMap.value[dialogId] = controller;
    
      chatService.startChatStream(data, {
        onopen(response) {
          if (response.ok && response.headers.get("content-type") === "text/event-stream") {
            setDialogIsStreaming(dialogId, true);
          }
        },
    
        onmessage(event) {
          try {
            const eventData = JSON.parse(event.data);
            if (eventData.code === 200) {
              if (eventData.sseId) {
                setDialogSseId(dialogId, eventData.sseId);
              }
              let currentIncomingMessage = getDialogIncomingMessage(dialogId);
              if (!currentIncomingMessage) {
                currentIncomingMessage = { content: '', type: 'AI' };
                addMessage(currentIncomingMessage);
                setDialogIncomingMessage(dialogId, currentIncomingMessage);
              }
              currentIncomingMessage.content += eventData.answer;
              if (eventData.finish) {
                setDialogIsStreaming(dialogId, false);
                setDialogIncomingMessage(dialogId, null);
              }
            } else {
              addSystemMessage(`错误: ${eventData.msg}`);
              closeConnection(dialogId);
            }
          } catch (e) {
            console.error('解析事件数据失败:', e);
            addSystemMessage('无法解析服务器返回的数据：' + e.message);
            closeConnection(dialogId);
          }
        },
    
        onclose() {
          if (getDialogIsStreaming(dialogId)) {
            addSystemMessage('连接已关闭');
            closeConnection(dialogId);
          }
        },
    
        onerror(error) {
          console.error('连接发生错误:', error);
          if (error.message === '未授权，请重新登录') {
            addSystemMessage('登录已过期，请重新登录');
          } else {
            addSystemMessage('连接发生错误，请稍后重试');
          }
          closeConnection(dialogId);
        },
    
        signal: controller.signal
      });
    };

    const stopStream = () => {
      const currentSSEId = getDialogSseId(selectedDialogId.value);
      if (currentSSEId) {
        chatService.stopChatStream(currentSSEId)
          .then(() => {
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

    const handleUploadFile = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('isPreview', false);

          fetch(`/uploadDialogueFile`, {
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

    const closeConnection = (dialogId) => {
      const controller = controllersMap.value[dialogId];
      if (controller) {
        controller.abort();
      }
      delete controllersMap.value[dialogId];
      delete incomingMessagesMap.value[dialogId];
      delete sseIdsMap.value[dialogId];
      delete isStreamingMap.value[dialogId];
    };

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

    const addMessage = (message) => {
      if (selectedDialog.value) {
        selectedDialog.value.messages.push(message);
      }
    };

    const addSystemMessage = (content) => {
      addMessage({ content, type: 'system' });
    };

    const isCurrentDialogStreaming = computed(() => {
      return getDialogIsStreaming(selectedDialogId.value);
    });

    const messagesToShow = computed(() => {
      return selectedDialog.value ? selectedDialog.value.messages : [];
    });

    watch(selectedDialogId, (newId) => {
      if (newId !== null) {
        selectedDialog.value = topicService.getTopicById(newId);
      } else {
        selectedDialog.value = null;
      }
    });

    onMounted(() => {
      loadTopics();
    });

    onUnmounted(() => {
      Object.keys(controllersMap.value).forEach((dialogId) => {
        closeConnection(dialogId);
      });
    });

    return {
      dialogs,
      selectedDialogId,
      messagesToShow,
      isCurrentDialogStreaming,
      selectDialog,
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