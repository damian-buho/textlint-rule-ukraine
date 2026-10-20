// @ts-check
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress", "json"],
  testRunner: "command",
  commandRunner: { command: "node --test 'dist/test/**/*.test.js'" },
  coverageAnalysis: "off",
  buildCommand: "npm run build:test",
  concurrency: 1,
  timeoutMS: 10_000,
};
export default config;
