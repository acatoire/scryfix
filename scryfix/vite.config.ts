import { defineConfig, type Plugin } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// See doc/scryfall-integration.md for the reasoning behind every origin listed here — update that
// doc's table alongside this string whenever a new external call/asset is added.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "connect-src 'self' https://api.scryfall.com https://api.github.com https://raw.githubusercontent.com https://embed.scryfall.com",
  "img-src 'self' blob: https://*.scryfall.io https://raw.githubusercontent.com",
  "style-src 'self' https://embed.scryfall.com",
  "script-src 'self' https://embed.scryfall.com",
  "font-src 'self' https://embed.scryfall.com",
].join('; ')

// Only for the production build, never the dev server: @vitejs/plugin-react's dev-time
// React-Refresh preamble is an inline <script> injected into index.html, which a script-src
// without 'unsafe-inline' would block — see doc/scryfall-integration.md.
function injectProductionCsp(): Plugin {
  return {
    name: 'inject-csp-meta',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://acatoire.github.io/scryfix/ — a repo subpath, not the domain root.
  // Only applies to `vite build`; the dev server still serves from `/`.
  base: command === 'build' ? '/scryfix/' : '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ...(command === 'build' ? [injectProductionCsp()] : []),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // json-summary feeds the coverage badge generated in .github/workflows/deploy.yml.
    // `all: true` instruments every src file, not just ones a test happens to import — otherwise
    // the untested React components would be invisible to the % instead of dragging it down.
    coverage: {
      reporter: ['text', 'json-summary'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/setupTests.ts', 'src/test-utils/**'],
    },
  },
}))
