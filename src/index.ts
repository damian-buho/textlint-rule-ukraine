// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import type { TextlintRuleModule } from "@textlint/types";
import { loadDictionary, type Entry } from "./dictionary.js";
import { preserveCase } from "./case-preserve.js";

export type Options = {
  // Geographic place names — enabled by default.
  geo?: boolean;
  // Personal names (first names, public figures).
  names?: boolean;
  // Opinionated / extra entries (e.g. lowercase "russia").
  extra?: boolean;
};

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const NEVER_MATCH = /(?!)/gu;

// Unicode-aware word boundary: matches where the adjacent char is NOT a
// letter, digit, or underscore — equivalent to \b but works for Cyrillic,
// CJK, and all Unicode scripts.  The `u` flag enables \p{} classes.
const WB = {
  open: "(?<![\\p{L}\\p{N}_])",
  close: "(?![\\p{L}\\p{N}_])",
};

const buildMatcher = (entries: Entry[]) => {
  // Flatten to (wrongString → entry) for O(1) lookup during matching.
  const byLowerWrong = new Map<string, Entry>();
  for (const entry of entries) {
    for (const w of entry.wrong) {
      byLowerWrong.set(w.toLowerCase(), entry);
    }
  }
  if (byLowerWrong.size === 0) {
    return { pattern: NEVER_MATCH, byLowerWrong };
  }
  // Sort longest-first in the alternation to prevent prefix shadowing.
  const allWrong = [...byLowerWrong.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`${WB.open}(?:${allWrong.map(escape).join("|")})${WB.close}`, "giu");
  return { pattern, byLowerWrong };
};

// Cache keyed by sorted enabled-tags string, e.g. "extra|geo|names".
const matcherCache = new Map<string, ReturnType<typeof buildMatcher>>();

const getMatcher = (enabledTags: string[]) => {
  const key = [...enabledTags].sort().join("|");
  if (!matcherCache.has(key)) {
    const entries = loadDictionary().filter((e: Entry) =>
      e.tags.some((t: string) => enabledTags.includes(t)),
    );
    matcherCache.set(key, buildMatcher(entries));
  }
  return matcherCache.get(key)!;
};

const resolveEnabledTags = (options: Options): string[] => {
  const tags: string[] = [];
  // geo is on by default; opt out with geo: false
  if (options.geo !== false) tags.push("geo");
  if (options.names === true) tags.push("names");
  if (options.extra === true) tags.push("extra");
  return tags;
};

const buildMessage = (wrong: string, replacement: string, entry: Entry): string => {
  if (entry.tags.includes("names")) {
    return `"${wrong}" is a russified personal name. Use the Ukrainian form "${replacement}" (${entry.id}).`;
  }
  if (entry.tags.includes("extra")) {
    return `"${wrong}" should be written as "${replacement}" (${entry.id}).`;
  }
  return `"${wrong}" is a russified place name. Use the Ukrainian spelling "${replacement}" (${entry.id}).`;
};

const reporter: TextlintRuleModule<Options> = (context, options = {}) => {
  const { Syntax, RuleError, fixer, report, getSource } = context;
  const matcher = getMatcher(resolveEnabledTags(options));

  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      // Reset lastIndex each time — pattern is shared and stateful.
      matcher.pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = matcher.pattern.exec(text)) !== null) {
        const wrong = m[0];
        const entry = matcher.byLowerWrong.get(wrong.toLowerCase());
        if (!entry) continue;
        const replacement = entry.exact ? entry.correct : preserveCase(wrong, entry.correct);
        // Skip entries where matched text already equals the correct spelling.
        if (replacement === wrong) continue;
        const start = m.index;
        const end = start + wrong.length;
        report(
          node,
          new RuleError(
            buildMessage(wrong, replacement, entry),
            { index: start, fix: fixer.replaceTextRange([start, end], replacement) },
          ),
        );
      }
    },
  };
};

// Both linter and fixer point to the same reporter so hasFixer() recognizes this rule as fixable.
export default { linter: reporter, fixer: reporter };
