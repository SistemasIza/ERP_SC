import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      '@emotion/react', 
      '@emotion/styled', 
      '@emotion/cache',
      '@emotion/serialize',
      '@emotion/utils',
      '@emotion/weak-memoize',
      '@mui/styled-engine',
      '@mui/material',
      '@mui/x-date-pickers',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Cleaner production build
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['axios', '@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'react-icons'],
          'vendor-charts': ['recharts'],
          'vendor-flow': ['@xyflow/react'],
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true, // Allow external access on local network
  },
  preview: {
    port: 4173,
  },
});
