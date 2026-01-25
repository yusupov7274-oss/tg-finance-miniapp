import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/tg-finance-miniapp/',
  server: {
    host: 'localhost',
    port: 3000,
    allowedHosts: [
      'web.xn--b1akc1f.store',
      'app.xn--b1akc1f.store',
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
