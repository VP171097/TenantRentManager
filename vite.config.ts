import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pageTitles } from './src/utils/pageTitles.js'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : (process.env.VITE_BASE_PATH || '/TenantRentManager/'),
  server: {
    host: '0.0.0.0', port: Number(process.env.PORT || 3000), strictPort: true,
    allowedHosts: ['.preview.emergentagent.com', '.preview.emergentcf.cloud'],
    watch: { followSymlinks: false, ignored: ['**/frontend/**', '**/.emergent/**', '**/.screenshots/**'] },
  },
  plugins: [react(), tailwindcss(), {
    name: 'rentbook-static-routes',
    apply: 'build',
    closeBundle() {
      // GitHub Pages cannot rewrite routes. Real HTML entry files give known
      // routes a 200 response and private routes noindex before JS executes.
      const html = readFileSync(resolve('dist/index.html'), 'utf8')
      const base = process.env.VITE_BASE_PATH || '/TenantRentManager/'
      for (const [route, title] of Object.entries(pageTitles)) {
        if (route === '/') continue
        const dir = resolve('dist', route.slice(1))
        mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, 'index.html'), html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`).replace('content="index,follow"', 'content="noindex,nofollow"').replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root"><p>Loading your secure RentBook page…</p></div>'))
      }
      writeFileSync(resolve('dist/404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Opening RentBook</title></head><body><p>Opening RentBook…</p><script>sessionStorage.setItem('rentbook-route', location.pathname + location.search + location.hash);location.replace(${JSON.stringify(base)});</script></body></html>`)
    },
  }],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
} as any))
