import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      },
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
      },
      '/api/sec': {
        target: 'https://data.sec.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sec/, ''),
        headers: {
          'User-Agent': 'ConvictionPortfolio admin@example.com',
        },
      },
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, ''),
      },
      '/api/bloomberg-rss': {
        target: 'https://feeds.bloomberg.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bloomberg-rss/, ''),
      },
      '/api/euronews-rss': {
        target: 'https://www.euronews.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/euronews-rss/, ''),
      },
      '/api/skynews-rss': {
        target: 'https://feeds.skynews.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/skynews-rss/, ''),
      },
    },
  },
})
