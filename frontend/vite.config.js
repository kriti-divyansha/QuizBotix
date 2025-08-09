import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // This is the section you need to add or update
  optimizeDeps: {
    exclude: ['axios', 'socket.io-client'],
  },
});


