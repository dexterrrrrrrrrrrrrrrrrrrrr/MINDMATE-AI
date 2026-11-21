import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sitesStaticWorker = () => ({
  name: 'vital-sense-sites-static-worker',
  apply: 'build',
  async closeBundle() {
    const serverDirectory = resolve('dist/server');
    await mkdir(serverDirectory, { recursive: true });
    await writeFile(resolve(serverDirectory, 'index.js'), `
export default {
  async fetch(request, env) {
    if (!env.ASSETS?.fetch) {
      return new Response('Static asset service unavailable.', { status: 500 });
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (response.status !== 404 || request.method !== 'GET' || !acceptsHtml) {
      return response;
    }

    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
`.trimStart(), 'utf8');
  },
});

export default defineConfig({
  plugins: [react(), sitesStaticWorker()],
  server: { proxy: { '/api/v1/account': { target: 'http://127.0.0.1:8000', changeOrigin: true } } },
  define: {
    'crypto.hash': 'undefined' // disables broken usage if any package tries it
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@react-three') || id.includes('/three/')) return 'three-vendor';
          if (id.includes('/gsap/')) return 'gsap-vendor';
          if (id.includes('/framer-motion/')) return 'motion-vendor';
          if (id.includes('/howler/')) return 'audio-vendor';
          if (id.includes('/react-markdown/') || id.includes('/remark-') || id.includes('/micromark')) return 'markdown-vendor';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) return 'react-vendor';
          return undefined;
        }
      }
    }
  }
});
