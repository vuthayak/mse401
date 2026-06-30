import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://<user>.github.io/mse401/
// Change '/mse401/' if your repo name differs.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/mse401/' : '/',
}))
