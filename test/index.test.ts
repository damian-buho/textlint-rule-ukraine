// Expose Node.js built-in test globals so textlint-tester can pick them up.
import { describe, it } from "node:test";
(globalThis as Record<string, unknown>).describe = describe;
(globalThis as Record<string, unknown>).it = it;

import TextLintTester from "textlint-tester";
import rule from "../lib/index.js";

const tester = new TextLintTester();

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
      errors: [{ message: '"Artyomovsk" is a russified place name. Use the Ukrainian spelling "Artemivsk" (artemivsk).' }],
    },
    {
      text: "ARTYOMOVSK is on the map.",
      output: "ARTEMIVSK is on the map.",
      errors: [{ message: '"ARTYOMOVSK" is a russified place name. Use the Ukrainian spelling "ARTEMIVSK" (artemivsk).' }],
    },
    {
      text: "Spelled artyomovsk wrong.",
      output: "Spelled artemivsk wrong.",
      errors: [{ message: '"artyomovsk" is a russified place name. Use the Ukrainian spelling "artemivsk" (artemivsk).' }],
    },
    {
      text: "Bahmut is a city in Ukraine.",
      output: "Bakhmut is a city in Ukraine.",
      errors: [{ message: '"Bahmut" is a russified place name. Use the Ukrainian spelling "Bakhmut" (bakhmut).' }],
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
  valid: [
    { text: "Oleh signed the document.", options: { names: true } },
  ],
  invalid: [
    {
      text: "Oleg signed the document.",
      output: "Oleh signed the document.",
      options: { names: true },
      errors: [{ message: '"Oleg" is a russified personal name. Use the Ukrainian form "Oleh" (oleh).' }],
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
  valid: [
    { text: "russia invaded Ukraine.", options: { extra: true } },
  ],
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

tester.run("geo: false — place names not checked", rule, {
  valid: [
    { text: "Artyomovsk is still there.", options: { geo: false } },
  ],
  invalid: [],
});
