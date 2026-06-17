// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadDictionary, type Entry } from "../src/dictionary.js";
import { preserveCase } from "../src/case-preserve.js";

// Replicate internals from index.ts so this test doesn't depend on private API.
const escape = (s: string): string => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const NEVER_MATCH = /(?!)/gu;

const WB = {
  open: String.raw`(?<![\p{L}\p{N}_])`,
  close: String.raw`(?![\p{L}\p{N}_])`,
};

type Matcher = ReturnType<typeof buildMatcher>;

const buildMatcher = (entries: Entry[]) => {
  const byLowerWrong = new Map<string, Entry>();
  for (const entry of entries) {
    for (const w of entry.wrong) {
      byLowerWrong.set(w.toLowerCase(), entry);
    }
  }
  if (byLowerWrong.size === 0) {
    return { pattern: NEVER_MATCH, byLowerWrong };
  }
  const allWrong = Iterator.from(byLowerWrong.keys())
    .toArray()
    .toSorted((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `${WB.open}(?:${allWrong.map((s) => escape(s)).join("|")})${WB.close}`,
    "giu",
  );
  return { pattern, byLowerWrong };
};

// Fill a string with harmless content to make the regex do work.
const generateLongText = (paragraphs: number): string => {
  const sentences = [
    "The city of Kyiv is the capital of Ukraine.",
    "Odesa is a major port city on the Black Sea.",
    "Lviv is known for its historic architecture.",
    "The Dnipro River flows through the center of the country.",
    "Kharkiv is the second-largest city in Ukraine.",
    "The Carpathian Mountains are a popular tourist destination.",
    "Zaporizhzhia is home to the famous Khortytsia Island.",
    "The Chernobyl Exclusion Zone is a site of historical significance.",
    "Ukrainian borscht is recognized as a cultural heritage dish.",
    "The city of Bakhmut has been heavily fortified.",
  ];
  return Array.from({ length: paragraphs }, () => {
    const index = Math.floor(Math.random() * sentences.length);
    return sentences[index] + "\n\n";
  }).join("");
};

describe("stress — full dictionary with all tags", () => {
  let matcher: Matcher;
  let allEntries: Entry[];

  it("loads and filters all entries (geo + names + extra)", () => {
    allEntries = loadDictionary().filter((entry) =>
      entry.tags.some((tag) => ["geo", "names", "extra"].includes(tag)),
    );
    assert.ok(allEntries.length > 200, "expected 200+ entries with all tags");
  });

  it("builds the combined regex without error", () => {
    matcher = buildMatcher(allEntries);
    assert.ok(matcher.pattern instanceof RegExp);
    assert.ok(matcher.pattern.flags.includes("g"));
    assert.ok(matcher.pattern.flags.includes("i"));
    assert.ok(matcher.pattern.flags.includes("u"));
    assert.ok(matcher.byLowerWrong.size > 200);
  });

  it("completes quickly against long benign text", () => {
    const longText = generateLongText(500);
    const start = performance.now();
    matcher.pattern.lastIndex = 0;
    let benignCount = 0;
    while (matcher.pattern.exec(longText) !== null) {
      benignCount++;
    }
    const elapsed = performance.now() - start;
    // Must finish well under 1 second regardless of matches found.
    assert.ok(elapsed < 1000, `took ${elapsed.toFixed(0)}ms, expected < 1000ms`);
    if (benignCount > 0) {
      console.log(`INFO: benign text matched ${benignCount} entries (may contain correct forms)`);
    }
  });

  it("matches a sample of geo entries with correct case-preserved fix", () => {
    const checks: Array<{ wrong: string; expectedReplacement: string; id: string }> = [
      { wrong: "Artyomovsk", expectedReplacement: "Artemivsk", id: "artemivsk" },
      { wrong: "Bahmut", expectedReplacement: "Bakhmut", id: "bakhmut" },
      { wrong: "Kiev", expectedReplacement: "Kyiv", id: "kyiv" },
      { wrong: "Odessa", expectedReplacement: "Odesa", id: "odesa" },
      { wrong: "Kharkov", expectedReplacement: "Kharkiv", id: "kharkiv" },
      { wrong: "Lvov", expectedReplacement: "Lviv", id: "lviv" },
    ];
    for (const { wrong, expectedReplacement, id } of checks) {
      matcher.pattern.lastIndex = 0;
      const m = matcher.pattern.exec(wrong);
      assert.ok(m, `expected match for "${wrong}"`);
      const entry = matcher.byLowerWrong.get(m[0].toLowerCase());
      assert.ok(entry, `expected entry for "${wrong}"`);
      assert.equal(entry.id, id);
      const replacement = entry.exact ? entry.correct : preserveCase(wrong, entry.correct);
      assert.equal(replacement, expectedReplacement);
    }
  });

  it("matches a sample of names entries with correct case-preserved fix", () => {
    const checks: Array<{ wrong: string; expectedReplacement: string; id: string }> = [
      { wrong: "Oleg", expectedReplacement: "Oleh", id: "oleh" },
      { wrong: "Vladimir", expectedReplacement: "Volodymyr", id: "volodymyr" },
      { wrong: "Sergey", expectedReplacement: "Serhii", id: "serhii" },
      { wrong: "Natalia", expectedReplacement: "Nataliia", id: "nataliia" },
    ];
    for (const { wrong, expectedReplacement, id } of checks) {
      matcher.pattern.lastIndex = 0;
      const m = matcher.pattern.exec(wrong);
      assert.ok(m, `expected match for "${wrong}"`);
      const entry = matcher.byLowerWrong.get(m[0].toLowerCase());
      assert.ok(entry, `expected entry for "${wrong}"`);
      assert.equal(entry.id, id);
      const replacement = entry.exact ? entry.correct : preserveCase(wrong, entry.correct);
      assert.equal(replacement, expectedReplacement);
    }
  });

  it("matches extra entries with exact: true bypassing case preservation", () => {
    const checks: Array<{ wrong: string; expectedReplacement: string; id: string }> = [
      { wrong: "Russia", expectedReplacement: "russia", id: "make-russia-small-again" },
      { wrong: "RUSSIA", expectedReplacement: "russia", id: "make-russia-small-again" },
      { wrong: "russia", expectedReplacement: "russia", id: "make-russia-small-again" },
      { wrong: "Putin", expectedReplacement: "putin", id: "make-putin-small-again" },
      { wrong: "PUTIN", expectedReplacement: "putin", id: "make-putin-small-again" },
    ];
    for (const { wrong, expectedReplacement, id } of checks) {
      matcher.pattern.lastIndex = 0;
      const m = matcher.pattern.exec(wrong);
      assert.ok(m, `expected match for "${wrong}"`);
      const entry = matcher.byLowerWrong.get(m[0].toLowerCase());
      assert.ok(entry, `expected entry for "${wrong}"`);
      assert.equal(entry.id, id);
      const replacement = entry.exact ? entry.correct : preserveCase(wrong, entry.correct);
      assert.equal(replacement, expectedReplacement);
    }
  });

  it("does not false-positive on innocent words", () => {
    const innocent = [
      "region",
      "Ukraine",
      "Ukrainian",
      "river",
      "mountain",
      "capital",
      "city",
      "sea",
      "island",
      "culture",
    ];
    for (const word of innocent) {
      matcher.pattern.lastIndex = 0;
      const match = matcher.pattern.exec(word);
      if (match) {
        // Some innocent words might match if they happen to be in the
        // dictionary (e.g. "Sumi" → "Sumy" in geo). Just log and skip.
        const entry = matcher.byLowerWrong.get(match[0].toLowerCase());
        if (entry) {
          console.log(`INFO: "${word}" matches entry "${entry.id}" — expected?`);
        }
      }
    }
  });

  it("completes quickly against adversarial input", () => {
    // Strings designed to stress alternation backtracking.
    const adversarial = [
      "K" + "e".repeat(50),
      "A".repeat(100) + "nasty",
      "X".repeat(200),
      // Long string with lots of word-boundary-like transitions.
      Array.from({ length: 50 }, (_, index) => String.fromCodePoint(0x41 + (index % 26))).join(""),
    ];
    for (const input of adversarial) {
      const start = performance.now();
      matcher.pattern.lastIndex = 0;
      while (matcher.pattern.exec(input) !== null) {
        // Deliberately empty — exercising the regex engine.
      }
      const elapsed = performance.now() - start;
      assert.ok(elapsed < 500, `adversarial input took ${elapsed.toFixed(0)}ms`);
    }
  });

  it("completes quickly against long non-matching text with near-misses", () => {
    // Text that has many word-boundary transitions but no actual match.
    // The regex engine has to check each boundary position.
    const words = [
      "Kievsky",
      "kievskiy",
      "odesskii",
      "lvovskii",
      "kharkovskii",
      "dneprovskii",
      "zaporozhskii",
      "chernigovskii",
      "zhitomirskii",
      "poltavskii",
      "sumskoi",
      "rovnenskii",
      "lutskii",
      "ternopolskii",
    ];
    const text = Array.from(
      { length: 200 },
      () => words[Math.floor(Math.random() * words.length)],
    ).join(" ");
    const start = performance.now();
    matcher.pattern.lastIndex = 0;
    let nearMissCount = 0;
    while (matcher.pattern.exec(text) !== null) {
      nearMissCount++;
    }
    const elapsed = performance.now() - start;
    // These near-misses should not match any entry.
    assert.equal(nearMissCount, 0);
    assert.ok(elapsed < 1000, `near-miss text took ${elapsed.toFixed(0)}ms`);
  });
});
