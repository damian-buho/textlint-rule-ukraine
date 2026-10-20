// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripTags, resolveEnabledTags, buildMatcher } from "../src/index.js";

describe("mutation killers — stripTags", () => {
  it("returns input unchanged when there is no closing '>'", () => {
    assert.equal(stripTags("a < b"), "a < b");
  });

  it("strips a complete tag", () => {
    assert.equal(stripTags("<div>hi</div>"), "     hi      ");
  });
});

describe("mutation killers — resolveEnabledTags", () => {
  it("enables geo by default", () => {
    assert.deepEqual(resolveEnabledTags({}), ["geo"]);
  });

  it("disables geo when geo: false", () => {
    assert.deepEqual(resolveEnabledTags({ geo: false }), []);
  });

  it("enables names and extra only when opted in", () => {
    assert.deepEqual(resolveEnabledTags({ names: true, extra: true }), ["geo", "names", "extra"]);
  });
});

describe("mutation killers — buildMatcher sort", () => {
  it("prefers the longest wrong string", () => {
    const matcher = buildMatcher([
      { wrong: ["Kie"], correct: "Ky", id: "kie", tags: ["geo"] },
      { wrong: ["Kiev"], correct: "Kyiv", id: "kiev", tags: ["geo"] },
    ]);
    matcher.pattern.lastIndex = 0;
    const m = matcher.pattern.exec("Kiev");
    assert.ok(m);
    assert.equal(m[0], "Kiev");
  });
});
