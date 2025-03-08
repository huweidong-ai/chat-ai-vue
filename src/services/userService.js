import request from '@/utils/request';

export const userService = {
  // 登录
  login(data) {
    return request({
      url: '/aiApi/login',  // 添加 /ai 前缀
      method: 'post',
      data
    });
  },

  // 注册
  register(data) {
    return request({
      url: '/aiApi/register',  // 添加 /ai 前缀
      method: 'post',
      data
    });
  }
};