// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

// Expose Node.js built-in test globals so textlint-tester can pick them up.
import { describe, it } from "node:test";
Object.defineProperties(globalThis, {
  describe: { value: describe, writable: true, configurable: true },
  it: { value: it, writable: true, configurable: true },
});

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

// --- dictionaryOverrides ----------------------------------------------------

tester.run("dictionaryOverrides — appends custom entries", rule, {
  valid: [
    {
      text: "Tsaritsyn is a city.",
      options: {
        dictionaryOverrides: [
          { wrong: ["Tsarytsyn"], correct: "Tsaritsyn", id: "tsaritsyn", tags: ["geo"] },
        ],
      },
    },
  ],
  invalid: [
    {
      text: "Tsarytsyn is a city.",
      output: "Tsaritsyn is a city.",
      options: {
        dictionaryOverrides: [
          { wrong: ["Tsarytsyn"], correct: "Tsaritsyn", id: "tsaritsyn", tags: ["geo"] },
        ],
      },
      errors: [
        {
          message:
            '"Tsarytsyn" is a russified place name. Use the Ukrainian spelling "Tsaritsyn" (tsaritsyn).',
        },
      ],
    },
  ],
});

// --- exact: true bypasses preserveCase --------------------------------------

tester.run("exact — bypasses case preservation", rule, {
  valid: [
    {
      text: "lower is the correct form.",
      options: { extra: true },
    },
  ],
  invalid: [
    {
      // Without exact: true, "TEST" would become "LOWER" via preserveCase.
      text: "TEST is wrong.",
      output: "lower is wrong.",
      options: {
        dictionaryOverrides: [
          { wrong: ["TEST"], correct: "lower", id: "exact-test", tags: ["geo"], exact: true },
        ],
      },
      errors: [
        {
          message:
            '"TEST" is a russified place name. Use the Ukrainian spelling "lower" (exact-test).',
        },
      ],
    },
    {
      text: "Test is wrong.",
      output: "lower is wrong.",
      options: {
        dictionaryOverrides: [
          { wrong: ["Test"], correct: "lower", id: "exact-test2", tags: ["geo"], exact: true },
        ],
      },
      errors: [
        {
          message:
            '"Test" is a russified place name. Use the Ukrainian spelling "lower" (exact-test2).',
        },
      ],
    },
    {
      text: "test is wrong.",
      output: "lower is wrong.",
      options: {
        dictionaryOverrides: [
          { wrong: ["test"], correct: "lower", id: "exact-test3", tags: ["geo"], exact: true },
        ],
      },
      errors: [
        {
          message:
            '"test" is a russified place name. Use the Ukrainian spelling "lower" (exact-test3).',
        },
      ],
    },
  ],
});

// --- geo: false --------------------------------------------------------------

tester.run("geo: false — place names not checked", rule, {
  valid: [{ text: "Artyomovsk is still there.", options: { geo: false } }],
  invalid: [],
});

// --- Image alt text -----------------------------------------------------------

tester.run("Image — flags russified name in alt text", rule, {
  valid: ["![Bakhmut photo](img.png)", "![](img.png)"],
  invalid: [
    {
      text: "![Artyomovsk cityscape](img.png)",
      output: "![Artemivsk cityscape](img.png)",
      errors: [
        {
          message:
            '"Artyomovsk" is a russified place name. Use the Ukrainian spelling "Artemivsk" (artemivsk).',
        },
      ],
    },
    {
      text: "![ARTYOMOVSK overview](img.png)",
      output: "![ARTEMIVSK overview](img.png)",
      errors: [
        {
          message:
            '"ARTYOMOVSK" is a russified place name. Use the Ukrainian spelling "ARTEMIVSK" (artemivsk).',
        },
      ],
    },
    {
      text: "![artyomovsk map](img.png)",
      output: "![artemivsk map](img.png)",
      errors: [
        {
          message:
            '"artyomovsk" is a russified place name. Use the Ukrainian spelling "artemivsk" (artemivsk).',
        },
      ],
    },
  ],
});

// --- Html blocks --------------------------------------------------------------

tester.run("Html — flags russified name in HTML blocks", rule, {
  valid: ["<div>Bakhmut is a city</div>", "<span>text without matches</span>"],
  invalid: [
    {
      text: "<div>Artyomovsk is a city</div>",
      output: "<div>Artemivsk is a city</div>",
      errors: [
        {
          message:
            '"Artyomovsk" is a russified place name. Use the Ukrainian spelling "Artemivsk" (artemivsk).',
        },
      ],
    },
    {
      text: "<p>ARTYOMOVSK on the map</p>",
      output: "<p>ARTEMIVSK on the map</p>",
      errors: [
        {
          message:
            '"ARTYOMOVSK" is a russified place name. Use the Ukrainian spelling "ARTEMIVSK" (artemivsk).',
        },
      ],
    },
  ],
});

tester.run("Html — word boundaries prevent matching inside tags", rule, {
  valid: [
    // Tag names must not be matched.
    "<artyomovsk>text</artyomovsk>",
  ],
  invalid: [],
});
