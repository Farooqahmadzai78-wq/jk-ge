import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Minimal, standalone Vitest config for unit tests.
 * Kept separate from the app's Vite/Nitro build config (vite.config.ts).
 * Tests here import pure, framework-free modules (no TanStack Start, no React,
 * no network), so only the TS path alias (`@/*`) needs to be resolved.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
