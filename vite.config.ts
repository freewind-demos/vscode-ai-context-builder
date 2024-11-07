import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, './src/extension.ts'),
            formats: ['cjs'],
            fileName: () => 'extension.js',
        },
        outDir: 'out',
        rollupOptions: {
            external: ['vscode', 'fs', 'path'],
            output: {
                format: 'cjs',
                sourcemap: false,
            }
        },
        sourcemap: false,
        minify: false,
        emptyOutDir: true
    },
    test: {
        globals: true,
        environment: 'node'
    }
}); 