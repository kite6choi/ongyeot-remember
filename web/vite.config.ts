import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '온곁 리멤버',
        short_name: '온곁',
        description: '반려동물을 떠나보낸 보호자를 위한 AI 케어',
        theme_color: '#C98B6B',
        background_color: '#FAF7F2',
        display: 'standalone',
        start_url: '/',
        icons: [
          // TODO: 실제 아이콘 이미지 추가 (192x192, 512x512)
          // 현재는 브라우저 기본 아이콘 사용
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(pets|journals|emotion_scores).*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1일
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
