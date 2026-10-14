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
        icons: []
      }
    })
  ]
});
