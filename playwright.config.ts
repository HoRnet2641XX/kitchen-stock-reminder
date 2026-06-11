import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'VITE_SUPABASE_URL=https://yffuwfayeabapxnubzrz.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_GQT_yvRKhgtY4xg8Sj5Mrg_kPa0kbU_ VITE_API_BASE_URL=https://kitchen-stock-reminder.vercel.app VITE_VAPID_PUBLIC_KEY=BCNYm6zucLkt4K6lNXBZTtVZgz6sWI5MHZIpaMBT04_cy0JldB9JhNFDwNpB0bq8SR2u6UrwTKnOh68yugj_Kl8 npm run dev -- --host 127.0.0.1 --port 5173',
    reuseExistingServer: true,
    url: 'http://127.0.0.1:5173',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
})
