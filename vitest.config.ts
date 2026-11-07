import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    dir: 'src',
    exclude: ['**/files/**', '**/component-files/**'],
  },
});
