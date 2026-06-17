// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preserveCase } from "../src/case-preserve.js";

// Helper: assert that preserveCase matches the replacement without any
// modification (the "mixed / unrecognised" fallback path).
const assertUnchanged = (matched: string, replacement: string) => {
  assert.equal(preserveCase(matched, replacement), replacement);
};

describe("preserveCase — empty string", () => {
  it("returns empty string when matched is empty", () => {
    assert.equal(preserveCase("", "Bakhmut"), "");
  });

  it("ignores empty replacement", () => {
    assert.equal(preserveCase("BAHMUT", ""), "");
  });
});

describe("preserveCase — single character", () => {
  it("lowercase single char → lowercase replacement", () => {
    assert.equal(preserveCase("a", "Bakhmut"), "bakhmut");
  });

  it("uppercase single char → uppercase replacement", () => {
    assert.equal(preserveCase("A", "Bakhmut"), "BAKHMUT");
  });

  it("non-alphabetic single char → all-caps path (single char is invariant)", () => {
    assert.equal(preserveCase("1", "Bakhmut"), "BAKHMUT");
    assert.equal(preserveCase("_", "Bakhmut"), "BAKHMUT");
    assert.equal(preserveCase(" ", "Bakhmut"), "BAKHMUT");
  });
});

describe("preserveCase — non-alphabetic strings", () => {
  it("numbers only → uppercase path (all same case)", () => {
    assert.equal(preserveCase("123", "Bakhmut"), "BAKHMUT");
  });

  it("mixed alphanumeric all uppercase → uppercase path", () => {
    assert.equal(preserveCase("ABC123", "bakhmut"), "BAKHMUT");
  });

  it("mixed alphanumeric all lowercase → lowercase path", () => {
    assert.equal(preserveCase("abc123", "BAKHMUT"), "bakhmut");
  });

  it("symbols only → uppercase path (all same case)", () => {
    assert.equal(preserveCase("___", "Bakhmut"), "BAKHMUT");
  });
});

describe("preserveCase — casing paths", () => {
  it("all uppercase → uppercase replacement", () => {
    assert.equal(preserveCase("BAHMUT", "Bakhmut"), "BAKHMUT");
  });

  it("all lowercase → lowercase replacement", () => {
    assert.equal(preserveCase("bahmut", "Bakhmut"), "bakhmut");
  });

  it("title case → title case replacement", () => {
    assert.equal(preserveCase("Bahmut", "bakhmut"), "Bakhmut");
  });

  it("multi-word title case → title case replacement", () => {
    // preserveCase treats the entire string after the first character as one
    // block — "oo bar" is all lowercase, so the title-case path activates.
    assert.equal(preserveCase("Foo bar", "bakhmut"), "Bakhmut");
  });

  it("mixed case falls through to unchanged", () => {
    assertUnchanged("bAhMuT", "Bakhmut");
    assertUnchanged("BAHmut", "Bakhmut");
  });
});

describe("preserveCase — non-alphabetic/casing boundary", () => {
  it("uppercase single letter → all-caps path", () => {
    assert.equal(preserveCase("A", "bc"), "BC");
  });

  it("casing path with non-letter prefix", () => {
    // "1abc" → all same case (lowercase), so lowercase path
    assert.equal(preserveCase("1abc", "Bakhmut"), "bakhmut");
    // Mixed digit+letter casing → mixed/unrecognised fallback
    assertUnchanged("1Abc", "Bakhmut");
    assertUnchanged("1aBC", "Bakhmut");
  });
});

describe("preserveCase — Cyrillic", () => {
  it("uppercase Cyrillic → uppercase replacement", () => {
    assert.equal(preserveCase("МАНЕВИЧИ", "Manevychi"), "MANEVYCHI");
  });

  it("lowercase Cyrillic → lowercase replacement", () => {
    assert.equal(preserveCase("маневичи", "Manevychi"), "manevychi");
  });

  it("title-case Cyrillic → title-case replacement", () => {
    assert.equal(preserveCase("Маневичи", "manevychi"), "Manevychi");
  });
});

describe("preserveCase — Unicode normalization", () => {
  it("precomposed é vs decomposed e+combining", () => {
    // U+00E9 (precomposed é) — all lowercase
    assert.equal(preserveCase("\u00E9", "Bakhmut"), "bakhmut");
    // U+0045 U+0301 (decomposed E + combining acute) — all uppercase
    assert.equal(preserveCase("\u0045\u0301", "Bakhmut"), "BAKHMUT");
  });

  it("NFC title-case works", () => {
    // Single character that uppercases to multi-char (ß → SS in some locales).
    // ß all lowercase → lowercase path.
    assert.equal(preserveCase("ß", "Bakhmut"), "bakhmut");
  });
});
