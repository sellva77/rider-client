import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
      basicSsl(),
    ],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_SOCKET_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: env.VITE_SOCKET_URL || 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
