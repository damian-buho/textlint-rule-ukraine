// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

// Expose Node.js built-in test globals so textlint-tester can pick them up.
import { describe, it } from "node:test";
(globalThis as Record<string, unknown>).describe = describe;
(globalThis as Record<string, unknown>).it = it;

import { createRequire } from "node:module";
const _required = createRequire(import.meta.url)("textlint-tester") as Record<string, unknown>;
const TesterCtor = (_required.default ?? _required) as new () => {
  run: (...arguments_: unknown[]) => void;
};
import rule from "../src/index.js";

const tester = new TesterCtor();

// --- geo (default) -----------------------------------------------------------

tester.run("geo — flags russified place names", rule, {
  valid: [
    "Bakhmut is a city in Ukraine.",
    "Artemivsk is a city in Luhansk Oblast.",
    // Code spans must be left untouched.
    "`Artyomovsk` inside backticks should be ignored.",
    "```\nArtyomovsk in a code block\n```",
  ],
  invalid: [
    {
      text: "Artyomovsk is a city in Luhansk Oblast.",
      output: "Artemivsk is a city in Luhansk Oblast.",
      errors: [
        {
          message:
            '"Artyomovsk" is a russified place name. Use the Ukrainian spelling "Artemivsk" (artemivsk).',
        },
      ],
    },
    {
      text: "ARTYOMOVSK is on the map.",
      output: "ARTEMIVSK is on the map.",
      errors: [
        {
          message:
            '"ARTYOMOVSK" is a russified place name. Use the Ukrainian spelling "ARTEMIVSK" (artemivsk).',
        },
      ],
    },
    {
      text: "Spelled artyomovsk wrong.",
      output: "Spelled artemivsk wrong.",
      errors: [
        {
          message:
            '"artyomovsk" is a russified place name. Use the Ukrainian spelling "artemivsk" (artemivsk).',
        },
      ],
    },
    {
      text: "Bahmut is a city in Ukraine.",
      output: "Bakhmut is a city in Ukraine.",
      errors: [
        {
          message:
            '"Bahmut" is a russified place name. Use the Ukrainian spelling "Bakhmut" (bakhmut).',
        },
      ],
    },
  ],
});

// --- names (opt-in) ----------------------------------------------------------

tester.run("names — not checked unless names: true", rule, {
  valid: [
    // Russian-style personal names are not flagged under the default config.
    { text: "Oleg runs the company.", options: {} },
  ],
  invalid: [],
});

tester.run("names — flags russified personal names", rule, {
  valid: [{ text: "Oleh signed the document.", options: { names: true } }],
  invalid: [
    {
      text: "Oleg signed the document.",
      output: "Oleh signed the document.",
      options: { names: true },
      errors: [
        { message: '"Oleg" is a russified personal name. Use the Ukrainian form "Oleh" (oleh).' },
      ],
    },
  ],
});

// --- extra (opt-in) ----------------------------------------------------------

tester.run("extra — not checked unless extra: true", rule, {
  valid: [
    // Extra entries are not flagged under the default config.
    { text: "Russia invaded Ukraine.", options: {} },
  ],
  invalid: [],
});

tester.run("extra — applies opinionated corrections", rule, {
  valid: [{ text: "russia invaded Ukraine.", options: { extra: true } }],
  invalid: [
    {
      text: "Russia invaded Ukraine.",
      output: "russia invaded Ukraine.",
      options: { extra: true },
      errors: [{ message: '"Russia" should be written as "russia" (make-russia-small-again).' }],
    },
  ],
});

// --- geo: false --------------------------------------------------------------

// --- Unicode-aware boundaries (Cyrillic) -------------------------------------

tester.run("geo — flags Cyrillic wrong spellings", rule, {
  valid: ["Manevychi is a town in Volyn Oblast."],
  invalid: [
    {
      text: "переехал в Маневичи вчера",
      output: "переехал в Manevychi вчера",
      errors: [
        {
          message:
            '"Маневичи" is a russified place name. Use the Ukrainian spelling "Manevychi" (manevychi).',
        },
      ],
    },
    {
      text: "МАНЕВИЧИ — town in Volyn.",
      output: "MANEVYCHI — town in Volyn.",
      errors: [
        {
          message:
            '"МАНЕВИЧИ" is a russified place name. Use the Ukrainian spelling "MANEVYCHI" (manevychi).',
        },
      ],
    },
    {
      text: "маневичи is a small town.",
      output: "manevychi is a small town.",
      errors: [
        {
          message:
            '"маневичи" is a russified place name. Use the Ukrainian spelling "manevychi" (manevychi).',
        },
      ],
    },
  ],
});

// --- unicode boundaries don't match inside words ----------------------------

tester.run("geo — unicode boundaries reject embedded matches", rule, {
  valid: [
    // The pattern must not match when the word is embedded in a larger word.
    "theArtyomovskcity is not a match.",
    "prefixМаневичиsuffix should not match.",
  ],
  invalid: [],
});

// --- geo: false --------------------------------------------------------------

tester.run("geo: false — place names not checked", rule, {
  valid: [{ text: "Artyomovsk is still there.", options: { geo: false } }],
  invalid: [],
});
