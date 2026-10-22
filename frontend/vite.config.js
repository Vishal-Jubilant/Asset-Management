import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

// Resolve certificate paths relative to this config file
const certsDir = path.resolve(import.meta.dirname, '../backend/certs')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['paperless', 'localhost', 'IT-SD2'],
    https: {
      key:  fs.readFileSync(path.join(certsDir, 'key.pem')),
      cert: fs.readFileSync(path.join(certsDir, 'cert.pem')),
    },
  },
})
