import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the SPA uses relative /api/* URLs; this proxy forwards them to the
// backend so the URL contract is identical to production (nginx).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
