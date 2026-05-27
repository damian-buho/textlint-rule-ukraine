// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Entry = {
  wrong: string[];
  correct: string;
  id: string;
  tags: string[];
  // When true, output correct verbatim — no case-preservation is applied.
  exact?: boolean;
};

let cached: Entry[] | undefined;

// Walk upward for the data/ sibling — handles published (dist/lib → up 2),
// dev build (dist/lib → up 2), and test compile (dist/test/src → up 3).
const findDictionaryPath = (): string => {
  let directory = import.meta.dirname;
  while (directory !== path.dirname(directory)) {
    const candidate = path.join(directory, "data", "dictionary.json");
    if (existsSync(candidate)) return candidate;
    directory = path.dirname(directory);
  }
  throw new Error("data/dictionary.json not found in any ancestor of " + import.meta.dirname);
};

export const loadDictionary = (): Entry[] => {
  if (cached === undefined) {
    cached = JSON.parse(readFileSync(findDictionaryPath(), "utf8")) as Entry[];
  }
  return cached;
};
