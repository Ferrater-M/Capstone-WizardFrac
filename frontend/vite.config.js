import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url))

// `import assets from 'virtual:public-assets'` → [{ url, size }] for every file in public/,
// so the start-up loading screen can download all of it before the game shows (see utils/assetPreloader.js).
// Pages (.html) and enemyData.txt are left out: they aren't art or sound.
function publicAssetList() {
  const id = 'virtual:public-assets'
  const resolved = '\0' + id
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    return e.isDirectory() ? walk(full) : [full]
  })
  return {
    name: 'public-asset-list',
    resolveId(source) { if (source === id) return resolved },
    load(loadId) {
      if (loadId !== resolved) return
      const list = walk(PUBLIC_DIR)
        .filter((f) => !/\.(html|txt)$/i.test(f))
        .map((f) => ({
          url: '/' + path.relative(PUBLIC_DIR, f).split(path.sep).map(encodeURIComponent).join('/'),
          size: fs.statSync(f).size,
        }))
      return `export default ${JSON.stringify(list)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publicAssetList()],
})
