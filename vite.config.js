import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  resolve: {
    // This tells Vite to automatically try these extensions in order when importing files
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
  },
  server: {
    port: 5173,
    proxy: {
      // Directs frontend fetch requests seamlessly to your Express server
      '/api': 'http://localhost:3000'
    }
  }
});