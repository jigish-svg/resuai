import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // The OpenAI SDK throws at construction if this is unset; tests that import
    // src/lib/openai/client.ts (directly or via vi.importActual) need a dummy
    // value present. No real key is used or required for these tests.
    env: { OPENAI_API_KEY: 'test-key' },
  },
});
