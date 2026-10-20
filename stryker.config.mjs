// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

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
