// Replace `replacement` text while preserving the casing style of `matched`.
export const preserveCase = (matched: string, replacement: string): string => {
  if (matched === matched.toUpperCase()) {
    // ALL CAPS → ALL CAPS
    return replacement.toUpperCase();
  }
  if (matched === matched.toLowerCase()) {
    // all lower → all lower
    return replacement.toLowerCase();
  }
  if (matched[0] === matched[0].toUpperCase() && matched.slice(1) === matched.slice(1).toLowerCase()) {
    // Title case → Title case
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  }
  // Mixed / unrecognised → return canonical replacement unchanged
  return replacement;
};
