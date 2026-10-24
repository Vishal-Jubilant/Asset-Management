import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

// Resolve certificate paths relative to this config file
const certsDir = path.resolve(import.meta.dirname, '../backend/certs')
const keyPath = path.join(certsDir, 'key.pem')
const certPath = path.join(certsDir, 'cert.pem')
const hasCertificates = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['paperless', 'localhost', 'IT-SD2'],
    https: hasCertificates ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    } : undefined,
  },
  preview: {
    port: 4001,
    allowedHosts: ['paperless', 'localhost', 'IT-SD2'],
    https: hasCertificates ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    } : undefined,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('lucide-react') || id.includes('@tabler')) return 'vendor-icons';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('date-fns')) return 'vendor-date';
            return 'vendor-core';
          }
        },
      },
    },
  },
})
