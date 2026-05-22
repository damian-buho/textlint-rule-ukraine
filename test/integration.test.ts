// Integration test: verify textlint can load our ESM package from disk
// via its real rule-resolution pipeline (npm pack → install → textlint CLI).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "..");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  version: string;
  devDependencies: Record<string, string>;
};

const packAndInstall = (workDir: string): void => {
  const tarball = execSync("npm pack --silent", { cwd: ROOT, encoding: "utf8" }).trim();
  const tarballPath = join(ROOT, tarball);
  writeFileSync(
    join(workDir, "package.json"),
    JSON.stringify({
      name: "integration-test-consumer",
      private: true,
      type: "module",
      dependencies: {
        textlint: PKG.devDependencies["textlint"] ?? "latest",
        "textlint-rule-ukraine": `file:${tarballPath}`,
      },
    }, null, 2),
  );
  execSync("npm install --silent", { cwd: workDir, stdio: "pipe" });
};

const runTextlint = (workDir: string, text: string, options?: Record<string, unknown>): string => {
  const rules = { "textlint-rule-ukraine": options ?? true };
  writeFileSync(join(workDir, ".textlintrc.json"), JSON.stringify({ rules }, null, 2));
  writeFileSync(join(workDir, "doc.md"), text);
  try {
    const out = execSync("npx textlint --format json doc.md", {
      cwd: workDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out;
  } catch (err: unknown) {
    // textlint exits non-zero when lint errors found — output is in stdout.
    if (err && typeof err === "object" && "stdout" in err) {
      return (err as { stdout: string }).stdout;
    }
    throw err;
  }
};

describe("integration — textlint loads ESM package", { concurrency: false }, () => {
  let workDir: string;

  it("setup: pack + install", () => {
    workDir = mkdtempSync(join(tmpdir(), "textlint-ukraine-int-"));
    packAndInstall(workDir);
    assert.ok(existsSync(join(workDir, "node_modules", "textlint-rule-ukraine", "lib", "index.js")));
  });

  it("flags russified place name", () => {
    const out = runTextlint(workDir, "Artyomovsk is a city.");
    const messages = JSON.parse(out);
    const msg = messages[0]?.messages?.[0];
    assert.ok(msg, "expected at least one lint message");
    assert.match(msg.message, /Artyomovsk.*Artemivsk/);
  });

  it("flags russified personal name with names option", () => {
    const out = runTextlint(workDir, "Oleg signed the document.", { names: true });
    const messages = JSON.parse(out);
    const msg = messages[0]?.messages?.[0];
    assert.ok(msg, "expected at least one lint message");
    assert.match(msg.message, /Oleg.*Oleh/);
  });

  it("auto-fixes to correct spelling", () => {
    // Set up a fresh document to fix.
    runTextlint(workDir, "Artyomovsk is a city.");
    try {
      execSync("npx textlint --fix doc.md", {
        cwd: workDir,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status !== 1) {
        throw err;
      }
    }
    // Read the fixed file to confirm the fix was applied.
    const fixed = execSync("cat doc.md", { cwd: workDir, encoding: "utf8" });
    const out2 = execSync("npx textlint --format json doc.md", {
      cwd: workDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const messages = JSON.parse(out2);
    const totalErrors = messages.reduce((sum: number, f: { messages: unknown[] }) => sum + f.messages.length, 0);
    assert.equal(totalErrors, 0, `expected no lint errors after fix, got: ${JSON.stringify(messages)}, file content: ${fixed}`);
  });

  it("cleanup", () => {
    rmSync(workDir, { recursive: true, force: true });
    const tarball = join(ROOT, `textlint-rule-ukraine-${PKG.version}.tgz`);
    if (existsSync(tarball)) rmSync(tarball);
  });
});
