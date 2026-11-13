import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { playlistProxyPlugin } from './vite-plugin-playlist-proxy.ts'

export default defineConfig({
  plugins: [react(), playlistProxyPlugin()],
})
