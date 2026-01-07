import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // 根目錄部署時使用 '/'，子應用程式部署時使用 '/app/'
  base: '/app/',
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
      '/api/user-management': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      '/api/role-management': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      '/api/permission': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      // Permission v2 API (Multi-Tenant)
      '/api/v2/permissions': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      // IdentityServer Configuration API (44302)
      '/api/Clients': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      '/api/ApiResources': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      '/api/ApiScopes': {
        target: 'https://localhost:44302',
        changeOrigin: true,
        secure: false,
      },
      '/api/IdentityResources': {
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
