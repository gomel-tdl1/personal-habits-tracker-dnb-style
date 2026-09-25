import { defineConfig } from "vitest/config";

// Pin a DST-observing timezone so date math is tested across clock changes.
process.env.TZ = "Europe/Berlin";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
