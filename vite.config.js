import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files - VITE_ prefix is exposed by default, 
  // we also need to explicitly load REACT_APP_ for compatibility
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'REACT_APP_'])

  return {
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    ],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.REACT_APP_SUPABASE_ANON_KEY),
      'import.meta.env.REACT_APP_SUPABASE_URL': JSON.stringify(env.REACT_APP_SUPABASE_URL),
      'import.meta.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(env.REACT_APP_SUPABASE_ANON_KEY),
    },
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            supabase: ['@supabase/supabase-js'],
            lucide: ['lucide-react'],
            toolkit: ['es-toolkit'],
          },
        },
      },
    },
  };
});
