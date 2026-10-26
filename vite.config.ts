import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Engine tests run in a plain Node environment — no DOM required.
    environment: 'node',
    // Surface all console output so test failures are easy to diagnose.
    reporter: 'verbose',
    // Explicitly include the test file pattern (Vitest default, shown here
    // for documentation clarity).
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})

