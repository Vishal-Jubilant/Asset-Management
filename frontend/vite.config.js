import react from '@vitejs/plugin-react'
import crypto from 'crypto'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'

// Compatible __dirname for ESM (works on all Node.js versions, unlike import.meta.dirname)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Resolve certificate paths relative to this config file
const certsDir = path.resolve(__dirname, '../backend/certs')
const keyPath = path.join(certsDir, 'key.pem')
const certPath = path.join(certsDir, 'cert.pem')

const getHttpsConfig = () => {
	if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
		throw new Error(`[SSL] Missing certificate files. Expected ${certPath} and ${keyPath}.`)
	}

	try {
		const key = crypto.createPrivateKey(fs.readFileSync(keyPath))
		const certificate = new crypto.X509Certificate(fs.readFileSync(certPath))
		const keyDer = crypto
			.createPublicKey(key)
			.export({ type: 'spki', format: 'der' })
		const certificateDer = certificate.publicKey.export({ type: 'spki', format: 'der' })

		if (!keyDer.equals(certificateDer)) {
			throw new Error('[SSL] Certificate and private key do not match.')
		}

		return {
			key: fs.readFileSync(keyPath),
			cert: fs.readFileSync(certPath),
		}
	} catch (error) {
		throw new Error(`[SSL] Invalid certificate configuration: ${error.message}`)
	}
}

const httpsConfig = getHttpsConfig()

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		allowedHosts: ['paperless', 'localhost', '115.245.23.187'],
		https: httpsConfig,
	},
	preview: {
		port: 4001,
		allowedHosts: ['paperless', 'localhost', '115.245.23.187'],
		https: httpsConfig,
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
