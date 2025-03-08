const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    // open 设置为 true 表示在启动开发服务器时自动打开浏览器窗口。
    open: true,
    // proxy 配置项用于设置代理规则，解决开发中的跨域问题。
    proxy: {
      // 定义代理规则，匹配以 '/aiApi' 开头的所有请求路径。
      '/aiApi': {
        target: process.env.VUE_APP_API_URL,
        changeOrigin: true,
        // pathRewrite 选项允许重写请求路径，'^/aiApi' 表示将所有 '/aiApi' 开头的请求路径重写为空字符串，即去掉 '/aiApi' 前缀。
        pathRewrite: { '^/aiApi': '' },
        ws: true,
        secure: false,
      }
    }
  }
})