import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      phaser: resolve(__dirname, 'node_modules/phaser'),
      'phaser-settings': resolve(__dirname, 'src/index.ts'),
    },
  },
});
