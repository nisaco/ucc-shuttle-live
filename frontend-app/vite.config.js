import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl() // This enables the Secure HTTPS mode
  ],
  server: {
    host: true,
    port: 5173,
    https: true // Force HTTPS
  }
})