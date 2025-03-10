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
import { uploadFile } from '@/services/fileService';
import { handleUnauthorized } from '@/services/authService';

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
    async handleSubmit() {
      const fileInput = this.$refs.fileInput;
      if (!fileInput.files.length) {
        this.message = '请选择一个文件';
        return;
      }

      const file = fileInput.files[0];
      const result = await uploadFile(file);

      if (result.success) {
        this.message = result.message;
      } else {
        this.message = result.message;
        if (result.message === '未授权，请重新登录') {
          handleUnauthorized();
        }
      }
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