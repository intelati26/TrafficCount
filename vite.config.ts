import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import fs from 'node:fs';

// Android (Capacitor) build: `vite build --mode android`. Offline app, no service worker, no CDN. The public/ folder is NOT copied
// wholesale (it holds GBs of built data); this plugin copies only the icons, a local DuckDB-WASM, and the Parquet files of the states
// named in ANDROID_STATES (default MO): core files only (seg, hist, sta, docs). Full attribute files are desktop only.
function androidAssets(outDir: string): Plugin {
  return {
    name: 'android-assets',
    apply: 'build',
    closeBundle() {
      const out = path.resolve(__dirname, outDir), pub = path.resolve(__dirname, 'public');
      for (const f of fs.readdirSync(pub)) if (/\.(png|svg|ico)$/.test(f)) fs.copyFileSync(path.join(pub, f), path.join(out, f));
      const dd = path.resolve(__dirname, 'node_modules/@duckdb/duckdb-wasm/dist');
      fs.mkdirSync(path.join(out, 'duckdb'), { recursive: true });
      for (const f of ['duckdb-eh.wasm', 'duckdb-browser-eh.worker.js']) fs.copyFileSync(path.join(dd, f), path.join(out, 'duckdb', f));
      const states = (process.env.ANDROID_STATES ?? 'MO').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      // no built data present (e.g. on GitHub Actions) or no states requested: ship a data-free app
      const mfPath = path.join(pub, 'data/q/manifest.json');
      const mf = fs.existsSync(mfPath) ? JSON.parse(fs.readFileSync(mfPath, 'utf8')) : { built: null, files: [] };
      const files = mf.files.filter((f: any) => states.includes(f.state) && ['seg', 'hist', 'sta', 'docs'].includes(f.kind) && (f.kind !== 'seg' || f.source));
      for (const f of files) {
        const dest = path.join(out, 'data/q', f.file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(path.join(pub, 'data/q', f.file), dest);
      }
      fs.mkdirSync(path.join(out, 'data/q'), { recursive: true });
      fs.writeFileSync(path.join(out, 'data/q/manifest.json'), JSON.stringify({ built: mf.built, files }, null, 1));
      const mb = files.reduce((a: number, f: any) => a + f.bytes, 0) / 1e6;
      console.log(`android assets: states ${states.join(',')}, ${files.length} data files, ${mb.toFixed(0)} MB`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const android = mode === 'android';
  return {
    ...(android ? { build: { outDir: 'dist-android', copyPublicDir: false, emptyOutDir: true } } : {}),
    plugins: [
      ...(android ? [androidAssets('dist-android')] : []),
      react(), 
      tailwindcss(),
      VitePWA({
        disable: android,
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'DOT Traffic Volume Archive Workstation',
          short_name: 'TrafficArch',
          description: 'Desktop and mobile workstation to view, analyze, and archive State DOT traffic volume maps, continuous count stations, and natural corridor datasets on Windows, Linux, and Android.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
