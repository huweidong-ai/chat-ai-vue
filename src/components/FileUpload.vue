<template>
  <div class="file-upload-container">
    <!-- 文件拖放区域 -->
    <div
      class="upload-area"
      @click="triggerFileInput"
      @drop.prevent="handleDrop"
      @dragover.prevent="dragover = true"
      @dragleave.prevent="dragover = false"
      :class="{ 'is-dragover': dragover }"
    >
      <div v-if="files.length === 0" class="upload-placeholder">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>拖放文件到这里或 <span class="browse-text">点击上传</span></p>
        <p class="upload-hint">支持 PDF、Word、Excel、TXT 等格式</p>
      </div>

      <!-- 文件列表 -->
      <div v-else class="file-list" @click.stop>
        <div v-for="(file, index) in files" :key="index" class="file-card">
          <!-- 文件类型图标 -->
          <div class="file-icon" :class="getFileIconClass(file.type)">
            <i class="fas" :class="getFileIconName(file.type)"></i>
          </div>
          
          <!-- 文件信息 -->
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-size">{{ formatFileSize(file.size) }}</div>
          </div>

          <!-- 删除按钮 -->
          <button class="delete-btn" @click="removeFile(index)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="toolbar">
      <div class="left-tools">
        <button class="tool-btn" :class="{ 'is-active': isConnected }">
          <i class="fas fa-wifi"></i>
          {{ isConnected ? '已连接' : '未连接' }}
        </button>
      </div>
      <div class="right-tools">
        <button class="tool-btn" @click="clearFiles">
          <i class="fas fa-trash-alt"></i>
        </button>
        <button class="tool-btn settings">
          <i class="fas fa-cog"></i>
        </button>
      </div>
    </div>

    <!-- 隐藏的文件输入框 -->
    <input
      type="file"
      ref="fileInput"
      multiple
      @change="handleFileSelect"
      style="display: none"
      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
    >
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';

export default {
  name: 'FileUpload',
  
  setup() {
    const files = ref([]);
    const dragover = ref(false);
    const fileInput = ref(null);
    const isConnected = ref(true);

    const getFileIconClass = (type) => {
      const typeMap = {
        'application/pdf': 'pdf',
        'application/msword': 'word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
        'application/vnd.ms-excel': 'excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
        'text/plain': 'txt'
      };
      return typeMap[type] || 'default';
    };

    const getFileIconName = (type) => {
      const iconMap = {
        'application/pdf': 'fa-file-pdf',
        'application/msword': 'fa-file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
        'application/vnd.ms-excel': 'fa-file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel',
        'text/plain': 'fa-file-alt'
      };
      return iconMap[type] || 'fa-file';
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDrop = (e) => {
      dragover.value = false;
      const droppedFiles = Array.from(e.dataTransfer.files);
      files.value = [...files.value, ...droppedFiles];
    };

    const handleFileSelect = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const selectedFiles = Array.from(e.target.files);
        files.value = [...files.value, ...selectedFiles];
        e.target.value = '';
      }
    };

    const triggerFileInput = () => {
      if (fileInput.value) {
        fileInput.value.click();
      }
    };

    const removeFile = (index) => {
      files.value.splice(index, 1);
    };

    const clearFiles = () => {
      files.value = [];
    };

    return {
      files,
      dragover,
      fileInput,
      isConnected,
      getFileIconClass,
      getFileIconName,
      formatFileSize,
      handleDrop,
      handleFileSelect,
      triggerFileInput,
      removeFile,
      clearFiles
    };
  }
};
</script>

<style scoped>
.file-upload-container {
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.upload-area {
  min-height: 200px;
  padding: 20px;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  margin: 20px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.upload-area:hover {
  border-color: #4f46e5;
  background: rgba(79, 70, 229, 0.02);
}

.upload-area.is-dragover {
  border-color: #4f46e5;
  background: rgba(79, 70, 229, 0.05);
}

.upload-placeholder {
  text-align: center;
  color: #666;
  width: 100%;
}

.upload-placeholder i {
  font-size: 48px;
  color: #4f46e5;
  margin-bottom: 16px;
  display: block;
}

.browse-text {
  color: #4f46e5;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
}

.browse-text:hover {
  text-decoration: underline;
  opacity: 0.8;
}

.upload-hint {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}

.file-list {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 16px;
  padding: 8px 0;
}

.file-card {
  flex: 0 0 auto;
  width: 200px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.file-icon.pdf {
  background: #ffebee;
  color: #f44336;
}

.file-icon.word {
  background: #e3f2fd;
  color: #2196f3;
}

.file-icon.excel {
  background: #e8f5e9;
  color: #4caf50;
}

.file-icon.txt {
  background: #f3e5f5;
  color: #9c27b0;
}

.file-info {
  flex: 1;
  overflow: hidden;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #333;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #eee;
}

.left-tools,
.right-tools {
  display: flex;
  gap: 8px;
}

.tool-btn {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.tool-btn:hover {
  background: #f5f5f5;
}

.tool-btn.is-active {
  color: #4f46e5;
}

.tool-btn.settings {
  color: #333;
}

/* 自定义滚动条样式 */
.file-list::-webkit-scrollbar {
  height: 6px;
}

.file-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.file-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.file-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style> 