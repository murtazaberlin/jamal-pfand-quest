import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 1152, height: 648 },
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    port: 5174,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
