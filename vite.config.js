import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ShareTung/', // ชื่อ Repository บน GitHub
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'ShareTung - แอปหารเงิน',
        short_name: 'ShareTung',
        description: 'แอปหารเงินและคำนวณค่าใช้จ่าย',
        theme_color: '#18181b',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/ShareTung/',
        start_url: '/ShareTung/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})