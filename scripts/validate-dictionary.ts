#!/usr/bin/env node

// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Ajv } from "ajv";

const require = createRequire(import.meta.url);
const addFormats: (ajv: Ajv) => void = require("ajv-formats");

interface DictionaryEntry {
  wrong: string[];
  correct: string;
  id: string;
  tags: string[];
  exact?: boolean;
}

// Walk upward to find project root (where package.json lives)
let root = import.meta.dirname;
while (root !== path.dirname(root)) {
  try {
    readFileSync(path.join(root, "package.json"), "utf8");
    break;
  } catch {
    root = path.dirname(root);
  }
}
const dictionaryPath = path.join(root, "data", "dictionary.json");
const schemaPath = path.join(root, "data", "dictionary.schema.json");

const dictionary = JSON.parse(readFileSync(dictionaryPath, "utf8")) as DictionaryEntry[];
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(dictionary);

if (!valid) {
  console.error("dictionary.json validation failed:\n");
  const errors = validate.errors ?? [];
  for (const error of errors) {
    const instancePath = error.instancePath || "/";
    console.error(`  ${instancePath} — ${error.message ?? "unknown error"}`);
    if (error.params) {
      const entries = Object.entries(error.params);
      for (const [key, value] of entries) {
        console.error(`    ${key}: ${JSON.stringify(value)}`);
      }
    }
  }
  throw new Error("schema validation failed");
}

// Cross-entry checks beyond schema
const ids = new Map<string, number>();
const wrongIndex = new Map<string, number>();
let issues = 0;

for (const [index, entry] of dictionary.entries()) {
  if (ids.has(entry.id)) {
    console.error(`  Duplicate id "${entry.id}" at index ${index} (first at ${ids.get(entry.id)})`);
    issues++;
  } else {
    ids.set(entry.id, index);
  }

  for (const w of entry.wrong) {
    const key = w.toLowerCase();
    if (wrongIndex.has(key)) {
      console.error(`  Duplicate wrong "${w}" at index ${index} (first at ${wrongIndex.get(key)})`);
      issues++;
    } else {
      wrongIndex.set(key, index);
    }
  }
}

if (issues > 0) {
  console.error(`\n${issues} issue(s) found.`);
  throw new Error(`${issues} duplicate issue(s)`);
}

console.log(`dictionary.json OK — ${dictionary.length} entries, no issues.`);
