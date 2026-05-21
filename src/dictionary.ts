import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Entry = {
  wrong: string[];
  correct: string;
  id: string;
  tags: string[];
  // When true, output correct verbatim — no case-preservation is applied.
  exact?: boolean;
};

let cached: Entry[] | null = null;

// lib/ sits one level above data/ — works both locally and in the published package.
export const loadDictionary = (): Entry[] => {
  if (!cached) {
    cached = JSON.parse(readFileSync(join(import.meta.dirname, "..", "data", "dictionary.json"), "utf8")) as Entry[];
  }
  return cached;
};
