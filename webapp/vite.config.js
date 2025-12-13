import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/cache_layer.php': 'http://localhost:8080',
      '/save_map.php': 'http://localhost:8080',
      '/get_history.php': 'http://localhost:8080'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
