import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, Vite forwards every /api request to the Express backend.
// The browser only ever talks to localhost:5173, so there are no CORS issues
// and the frontend code can simply call "/api/...".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
