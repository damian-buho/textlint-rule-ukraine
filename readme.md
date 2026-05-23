<!--
SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>

SPDX-License-Identifier: MIT
-->

# textlint-rule-ukraine

[![StandWithUkraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg)](https://github.com/vshymanskyy/StandWithUkraine/blob/main/docs/README.md)
![NPM Downloads](https://img.shields.io/npm/dm/textlint-rule-ukraine?style=flat-square)
![NPM Version](https://img.shields.io/npm/v/textlint-rule-ukraine?style=flat-square)
![NPM Last Update](https://img.shields.io/npm/last-update/textlint-rule-ukraine?style=flat-square)
![npm bundle size](https://img.shields.io/bundlephobia/min/textlint-rule-ukraine?style=flat-square)
![NPM License](https://img.shields.io/npm/l/textlint-rule-ukraine?style=flat-square)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

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

## Options

The dictionary is split into tagged groups. `geo` is on by default; `names` and `extra` are opt-in.

| Option  | Default | Covers                                            |
| ------- | ------- | ------------------------------------------------- |
| `geo`   | `true`  | Place names (cities, regions, rivers)             |
| `names` | `false` | Personal names (first names, public figures)      |
| `extra` | `false` | Opinionated corrections (e.g. lowercase _russia_) |

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

## Dictionary

All entries live in `data/dictionary.json`. Each entry has the form:

```json
{ "wrong": ["Bahmut", "Bahmoot"], "correct": "Bakhmut", "id": "bakhmut", "tags": ["geo"] }
```

By default replacements are case-preserving (`Bahmut→Bakhmut`, `BAHMUT→BAKHMUT`). Add `"exact": true` to always output `correct` verbatim regardless of input casing:

```json
{ "wrong": ["Russia"], "correct": "russia", "id": "example", "exact": true, "tags": ["extra"] }
```

## Contributing

Dictionary improvements go directly in `data/dictionary.json`. Rule improvements (casing logic, AST handling, performance) go in `src/`.

## License

MIT
