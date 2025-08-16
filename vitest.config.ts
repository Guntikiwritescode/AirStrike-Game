/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Limit memory usage and improve performance
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork to prevent memory leaks
      },
    },
    // Reduce heap size for individual tests
    forceRerunTriggers: ['**/vitest.config.*', '**/vite.config.*'],
    isolate: true, // Isolate each test file
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});