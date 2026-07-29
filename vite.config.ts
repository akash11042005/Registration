import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // No /api proxy here — the real backend is the Vercel serverless
    // functions under /api, tested locally with `vercel dev` (which runs
    // both the frontend and the /api functions together), not plain
    // `vite dev`. A stale proxy here used to point at a since-removed
    // legacy Express server on :5000 and would have silently misrouted
    // every API call if anyone ever ran plain `vite dev` instead.
  },
})