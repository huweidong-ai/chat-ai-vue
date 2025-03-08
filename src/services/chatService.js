import request from '@/utils/request';

export const chatService = {
  // 开始SSE聊天流
//   startChatStream(data) {
//     return request({
//       url: '/aiApi/sse/chat',
//       method: 'post',
//       data
//     });
//   },

  // 停止SSE聊天流
  stopChatStream(sseId) {
    return request({
      url: `/aiApi/sse/stop/${sseId}`,
      method: 'get'
    });
  }
};