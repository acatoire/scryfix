import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://acatoire.github.io/scryfix/ — a repo subpath, not the domain root.
  // Only applies to `vite build`; the dev server still serves from `/`.
  base: command === 'build' ? '/scryfix/' : '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  test: {
    // json-summary feeds the coverage badge generated in .github/workflows/deploy.yml.
    // `all: true` instruments every src file, not just ones a test happens to import — otherwise
    // the untested React components would be invisible to the % instead of dragging it down.
    coverage: {
      reporter: ['text', 'json-summary'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.ts', 'src/main.tsx'],
    },
  },
}))
