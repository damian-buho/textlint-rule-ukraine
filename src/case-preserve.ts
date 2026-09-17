// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

// Replace `replacement` text while preserving the casing style of `matched`.
export const preserveCase = (matched: string, replacement: string): string => {
  if (matched === "") return "";
  if (matched === matched.toUpperCase()) {
    // ALL CAPS → ALL CAPS
    return replacement.toUpperCase();
  }
  if (matched === matched.toLowerCase()) {
    // all lower → all lower
    return replacement.toLowerCase();
  }
  const first = matched.at(0);
  const isTitle =
    first !== undefined &&
    first === first.toUpperCase() &&
    matched.slice(1) === matched.slice(1).toLowerCase();
  return isTitle
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
    : replacement;
};
