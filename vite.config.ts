import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pageTitles } from './src/utils/pageTitles.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // GitHub Pages needs /TenantRentManager/
  // Capacitor Android needs relative ./ paths
  const isCapacitor = mode === 'capacitor'

  const base = isCapacitor
    ? './'
    : command === 'serve'
      ? '/'
      : (process.env.VITE_BASE_PATH || '/TenantRentManager/')

  return {
    base,

    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT || 3000),
      strictPort: true,
      allowedHosts: [
        'preview.emergentagent.com',
        '.preview.emergentagent.com',
      ],
      watch: {
        followSymlinks: false,
        ignored: ['**/frontend/**', '**/.emergent/**'],
      },
    },

    plugins: [
      react(),
      tailwindcss(),

      {
        name: 'rentbook-static-routes',
        apply: 'build',

        closeBundle() {
          // GitHub Pages cannot rewrite routes.
          // Real HTML entry files give routes a 200 response
          // and private routes no longer index before JS executes.

          const html = readFileSync(
            resolve('dist/index.html'),
            'utf8'
          )

          const routeBase = isCapacitor
            ? './'
            : (process.env.VITE_BASE_PATH || '/TenantRentManager/')

          for (const [route, title] of Object.entries(pageTitles)) {
            if (route === '/') continue

            const dir = resolve('dist', route.slice(1))

            mkdirSync(dir, { recursive: true })

            writeFileSync(
              resolve(dir, 'index.html'),
              html.replace(
                /<title>.*?<\/title>/,
                `<title>${title}</title>`
              )
            )
          }

          writeFileSync(
            resolve('dist/404.html'),
            '<!doctype html><html lang="en"></html>'
          )
        },
      },
    ],

    test: {
      include: ['src/**/*.{test,ts,tsx}'],
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  } as any
})
