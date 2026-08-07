import { defineConfig } from 'vite'
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
}))
