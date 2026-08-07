import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'crypto.hash': 'undefined' // disables broken usage if any package tries it
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@react-three') || id.includes('/three/')) return 'three-vendor';
          if (id.includes('/firebase/') || id.includes('@firebase')) return 'firebase-vendor';
          if (id.includes('/gsap/') || id.includes('/framer-motion/') || id.includes('/howler/')) return 'motion-media';
          if (id.includes('/react-markdown/') || id.includes('/remark-') || id.includes('/micromark')) return 'markdown-vendor';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) return 'react-vendor';
          return undefined;
        }
      }
    }
  }
});
