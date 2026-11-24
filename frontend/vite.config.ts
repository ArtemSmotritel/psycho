import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    resolve: {
        alias: {
            // The SPA build prerenders the root page under Bun. The Bun build of react-dom/server
            // lacks renderToPipeableStream, so the build uses the Node build instead.
            'react-dom/server': 'react-dom/server.node',
        },
    },
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    server: {
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL ?? 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
})
