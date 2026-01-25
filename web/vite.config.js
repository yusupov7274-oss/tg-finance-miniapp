import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3000,
    allowedHosts: [
      'web.xn--b1akc1f.store',
      'app.xn--b1akc1f.store',
    ],
  },
})
