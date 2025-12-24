import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // 代理 API 請求到後端 Admin 應用程式
    // 路由格式：/{Controller}/{Action}（不含 Area 前綴）
    proxy: {
      // Admin MVC 路由 (44303)
      '/Organization': {
        target: 'https://localhost:44303',
        changeOrigin: true,
        secure: false, // 允許自簽章憑證
      },
      '/Configuration': {
        target: 'https://localhost:44303',
        changeOrigin: true,
        secure: false,
      },
      '/Identity': {
        target: 'https://localhost:44303',
        changeOrigin: true,
        secure: false,
      },
      '/Home': {
        target: 'https://localhost:44303',
        changeOrigin: true,
        secure: false,
      },
      // Admin.Api RESTful API (44302)
      '/api/organization': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      // 其他 Admin MVC API
      '/api': {
        target: 'https://localhost:44303',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
