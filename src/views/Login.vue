<template>
  <div class="login-container">
    <h2>登录</h2>
    <form @submit.prevent="handleLogin">
      <input type="text" v-model="username" placeholder="用户名" required>
      <input type="password" v-model="password" placeholder="密码" required>
      <input type="submit" value="登录">
    </form>
    <div id="message">{{ message }}</div>
    <div class="nav-link">
      没有账号？<router-link to="/register">立即注册</router-link>
    </div>
  </div>
</template>

<script>
import { userService } from '@/services/userService';
import { setToken } from '@/services/authService';

export default {
  name: 'UserLogin',
  data() {
    return {
      username: '',
      password: '',
      message: ''
    };
  },
  methods: {
    async handleLogin() {
      this.username = this.username.trim();
      this.password = this.password.trim();

      if (!this.username || !this.password) {
        this.message = '请输入用户名和密码';
        return;
      }

      try {
        const data = await userService.login({
          username: this.username,
          password: this.password
        });
        
        if (data.success) {
          const token = data.data.token;
          setToken(token);
          this.$router.push('/chat');
        } else {
          this.message = data.message || '登录失败，请检查用户名和密码';
        }
      } catch (error) {
        if (error.message) {
          this.message = error.message;
        } else {
          this.message = '网络错误，请重试';
        }
      }
    }
  }
};
</script>

<style scoped>
/* 删除 body 相关样式 */
.login-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 300px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
h2 {
  text-align: center;
  color: #333;
}
form {
  display: flex;
  flex-direction: column;
}
input[type="text"], input[type="password"] {
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
input[type="submit"] {
  background-color: #007BFF;
  color: #fff;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
input[type="submit"]:hover {
  background-color: #0056b3;
}
#message {
  margin-top: 20px;
  text-align: center;
  color: #d9534f;
}

.nav-link {
  margin-top: 15px;
  text-align: center;
  color: #666;
}

.nav-link a {
  color: #007BFF;
  text-decoration: none;
}

.nav-link a:hover {
  text-decoration: underline;
}
</style>