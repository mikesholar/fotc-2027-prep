import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    poolOptions: {
      forks: { execArgv: ["--no-experimental-webstorage"] },
      threads: { execArgv: ["--no-experimental-webstorage"] },
    },
  },
});
