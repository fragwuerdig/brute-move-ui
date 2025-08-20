import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert';
import path from 'path';


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  define: {
    global: 'window',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },

})
