import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Pin a DST-observing timezone so date math is tested across clock changes.
process.env.TZ = "Europe/Berlin";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
