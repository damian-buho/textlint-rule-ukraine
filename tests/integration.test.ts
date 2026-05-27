// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

// Integration test: verify textlint can load our ESM package from disk
// via its real rule-resolution pipeline (npm pack → install → textlint CLI).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
const PKG = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  version: string;
  devDependencies: Record<string, string>;
};

const packAndInstall = (workDirectory: string): void => {
  const tarball = execSync("npm pack --silent", { cwd: ROOT, encoding: "utf8" }).trim();
  const tarballPath = path.join(ROOT, tarball);
  writeFileSync(
    path.join(workDirectory, "package.json"),
    JSON.stringify(
      {
        name: "integration-test-consumer",
        private: true,
        type: "module",
        dependencies: {
          textlint: PKG.devDependencies["textlint"] ?? "latest",
          "textlint-rule-ukraine": `file:${tarballPath}`,
        },
      },
      undefined,
      2,
    ),
  );
  execSync("npm install --silent", { cwd: workDirectory, stdio: "pipe" });
};

const runTextlint = (
  workDirectory: string,
  text: string,
  options?: Record<string, unknown>,
): string => {
  const rules = { "textlint-rule-ukraine": options ?? true };
  writeFileSync(
    path.join(workDirectory, ".textlintrc.json"),
    JSON.stringify({ rules }, undefined, 2),
  );
  writeFileSync(path.join(workDirectory, "doc.md"), text);
  try {
    const out = execSync("npx textlint --format json doc.md", {
      cwd: workDirectory,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out;
  } catch (error: unknown) {
    // textlint exits non-zero when lint errors found — output is in stdout.
    if (error && typeof error === "object" && "stdout" in error) {
      return (error as { stdout: string }).stdout;
    }
    throw error;
  }
};

describe("integration — textlint loads ESM package", { concurrency: false }, () => {
  let workDirectory: string;

  it("setup: pack + install", () => {
    workDirectory = mkdtempSync(path.join(tmpdir(), "textlint-ukraine-int-"));
    packAndInstall(workDirectory);
    assert.ok(
      existsSync(
        path.join(
          workDirectory,
          "node_modules",
          "textlint-rule-ukraine",
          "dist",
          "lib",
          "index.js",
        ),
      ),
    );
  });

  it("flags russified place name", () => {
    const out = runTextlint(workDirectory, "Artyomovsk is a city.");
    const messages = JSON.parse(out);
    const message = messages[0]?.messages?.[0];
    assert.ok(message, "expected at least one lint message");
    assert.match(message.message, /Artyomovsk.*Artemivsk/);
  });

  it("flags russified personal name with names option", () => {
    const out = runTextlint(workDirectory, "Oleg signed the document.", { names: true });
    const messages = JSON.parse(out);
    const message = messages[0]?.messages?.[0];
    assert.ok(message, "expected at least one lint message");
    assert.match(message.message, /Oleg.*Oleh/);
  });

  it("auto-fixes to correct spelling", () => {
    // Set up a fresh document to fix.
    runTextlint(workDirectory, "Artyomovsk is a city.");
    try {
      execSync("npx textlint --fix doc.md", {
        cwd: workDirectory,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status: number }).status !== 1
      ) {
        throw error;
      }
    }
    // Read the fixed file to confirm the fix was applied.
    const fixed = execSync("cat doc.md", { cwd: workDirectory, encoding: "utf8" });
    const out2 = execSync("npx textlint --format json doc.md", {
      cwd: workDirectory,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const messages = JSON.parse(out2);
    const totalErrors = messages.reduce(
      (sum: number, f: { messages: unknown[] }) => sum + f.messages.length,
      0,
    );
    assert.equal(
      totalErrors,
      0,
      `expected no lint errors after fix, got: ${JSON.stringify(messages)}, file content: ${fixed}`,
    );
  });

  it("cleanup", () => {
    rmSync(workDirectory, { recursive: true, force: true });
    const tarball = path.join(ROOT, `textlint-rule-ukraine-${PKG.version}.tgz`);
    if (existsSync(tarball)) rmSync(tarball);
  });
});
