import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'os'

// Get local IP address dynamically
function getLocalIP() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: `http://${getLocalIP()}:8001`,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          // Handle proxy errors gracefully
          proxy.on('error', (err) => {
            console.log('Proxy error:', err)
          })
        }
      },
    },
  },
})
