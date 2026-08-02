<!--
SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>

SPDX-License-Identifier: MIT
-->

# textlint-rule-ukraine

[![StandWithUkraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg)](https://github.com/vshymanskyy/StandWithUkraine/blob/main/docs/README.md)
![NPM Downloads](https://img.shields.io/npm/dm/textlint-rule-ukraine?style=flat-square)
![NPM Version](https://img.shields.io/npm/v/textlint-rule-ukraine?style=flat-square)
![NPM Last Update](https://img.shields.io/npm/last-update/textlint-rule-ukraine?style=flat-square)
![NPM License](https://img.shields.io/npm/l/textlint-rule-ukraine?style=flat-square)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
![Libraries.io dependency status for GitHub repo](https://img.shields.io/librariesio/github/damian-buho/textlint-rule-ukraine?style=flat-square)

[![Pipeline](https://github.com/damian-buho/textlint-rule-ukraine/actions/workflows/pipeline.yaml/badge.svg)](https://github.com/damian-buho/repolinter/actions/workflows/pipeline.yaml)
[![CodeQL](https://github.com/damian-buho/textlint-rule-ukraine/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/damian-buho/textlint-rule-ukraine/actions/workflows/github-code-scanning/codeql)
[![Known Vulnerabilities](https://snyk.io/test/npm/textlint-rule-ukraine/badge.svg)](https://snyk.io/test/npm/textlint-rule-ukraine)
[![REUSE status](https://api.reuse.software/badge/github.com/damian-buho/textlint-rule-ukraine)](https://api.reuse.software/info/github.com/damian-buho/textlint-rule-ukraine)


A [textlint](https://textlint.github.io/) rule that detects and fixes russified spellings of Ukrainian geographical and personal names.

The corrections database is sourced from the [SpellingUkraine](https://github.com/Tyrrrz/SpellingUkraine) project (MIT) and other sources.

## Install

```shell
npm install --save-dev textlint textlint-rule-ukraine
```

## Usage

Add the rule to your `.textlintrc`:

```json
{
  "rules": {
    "ukraine": true
  }
}
```

Lint your Markdown files:

```shell
npx textlint docs/**/*.md
```

Auto-fix in place:

```shell
npx textlint --fix docs/**/*.md
```

Replacements are case-preserving:

| Input        | Output      |
| ------------ | ----------- |
| `Bahmut`     | `Bakhmut`   |
| `BAHMUT`     | `BAKHMUT`   |
| `bahmut`     | `bakhmut`   |
| `Artyomovsk` | `Artemivsk` |

Text inside fenced code blocks and inline backtick spans is never touched.

Only three casing patterns are detected: **ALL CAPS**, **all lower**, and **Title case**. Mixed or irregular casing like `aRTyOMovsK` is left in canonical form (`Artemivsk`) instead of trying to mirror a garbled input — the fix is always clean Ukrainian orthography.

## Options

The dictionary is split into tagged groups. `geo` is on by default; `names` and `extra` are opt-in.

| Option                | Default  | Covers                                                      |
| --------------------- | -------- | ----------------------------------------------------------- |
| `geo`                 | `true`   | Place names (cities, regions, rivers)                       |
| `names`               | `false`  | Personal names (first names, public figures)                |
| `extra`               | `false`  | Opinionated corrections (e.g. lowercase _russia_)           |
| `dictionaryOverrides` | `[]`     | Additional entries appended at runtime (see below)          |

To enable personal names checking:

```json
{
  "rules": {
    "ukraine": { "names": true }
  }
}
```

To enable all groups:

```json
{
  "rules": {
    "ukraine": { "names": true, "extra": true }
  }
}
```

To disable place names (e.g. when only personal names matter):

```json
{
  "rules": {
    "ukraine": { "geo": false, "names": true }
  }
}
```

### `dictionaryOverrides`

Append entries to the dictionary at runtime without patching `data/dictionary.json` inside `node_modules`. Each entry follows the same shape as the built-in dictionary and supports the same fields, including the `exact` flag (see [Dictionary](#dictionary)):

```json
{
  "rules": {
    "ukraine": {
      "dictionaryOverrides": [
        { "wrong": ["Novoiavorivsk"], "correct": "Novoiavorivsk", "id": "novoiavorivsk", "tags": ["geo"] }
      ]
    }
  }
}
```

If an override declares the same `wrong` string as a built-in entry, the override wins (last-write-wins).

## Dictionary

All entries live in `data/dictionary.json`. Each entry has the form:

```json
{ "wrong": ["Bahmut", "Bahmoot"], "correct": "Bakhmut", "id": "bakhmut", "tags": ["geo"] }
```

By default replacements are case-preserving (`Bahmut→Bakhmut`, `BAHMUT→BAKHMUT`). Add `"exact": true` to always output `correct` verbatim regardless of input casing:

```json
{ "wrong": ["Russia"], "correct": "russia", "id": "example", "exact": true, "tags": ["extra"] }
```

Override entries follow the same format — use `tags` to control which option group activates them.

## Contributing

Dictionary improvements go directly in `data/dictionary.json`. Rule improvements (casing logic, AST handling, performance) go in `src/`.

## License

MIT
