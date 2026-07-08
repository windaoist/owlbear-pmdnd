import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: '/owlbear-pmdnd/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@renderer': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
})
