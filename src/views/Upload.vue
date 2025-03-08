<template>
  <div class="upload-container">
    <h2>文件上传</h2>
    <button @click="goToChat" class="nav-button">前往聊天</button>
    <form @submit.prevent="handleSubmit">
      <input type="file" name="file" ref="fileInput" required>
      <input type="submit" value="上传文件">
    </form>
    <div id="message">{{ message }}</div>
  </div>
</template>

<script>
export default {
  name: 'FileUpload',
  data() {
    return {
      message: ''
    };
  },
  methods: {
    goToChat() {
      this.$router.push('/chat');
    },
    getCookie(name) {
      const cookies = document.cookie.split(';').map(cookie => cookie.trim());
      for (const cookie of cookies) {
        const [key, value] = cookie.split('=');
        if (key === name) {
          return decodeURIComponent(value);
        }
      }
      return null;
    },
    handleSubmit() {
      const fileInput = this.$refs.fileInput;
      if (!fileInput.files.length) {
        this.message = '请选择一个文件';
        return;
      }

      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const token = this.getCookie('authToken');
      if (!token) {
        this.message = '未登录，请先登录';
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
      }

      fetch('/uploadFile', {
        method: 'POST',
        headers: {
          Authorization: token
        },
        body: formData
      })
      .then(response => {
        if (response.status === 401) {
          throw new Error('未授权，请重新登录');
        }
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('上传失败，请检查网络或服务器状态');
        }
      })
      .then(data => {
        this.message = '文件上传成功！' + (data.message ? `(${data.message})` : '');
      })
      .catch(error => {
        if (error.message === '未授权，请重新登录') {
          this.message = error.message;
          setTimeout(() => window.location.href = 'login.html', 2000);
        } else {
          this.message = error.message;
        }
      });
    }
  }
};
</script>

<style scoped>
body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f9;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}
#添加导航按钮样式
.nav-button {
    margin: 10px;
    padding: 8px 16px;
    background-color: #28a745;
    color: white;
}
.upload-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 300px;
}
h2 {
  text-align: center;
  color: #333;
}
form {
  display: flex;
  flex-direction: column;
}
input[type="file"] {
  margin-bottom: 20px;
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
</style>