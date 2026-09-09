// The segmentation rule. The second invariant of the project.
//
//   split at "\n\n" (blank line), so paragraphs — not sentences
//   trim whitespace at both ends of every segment
//   drop empty segments
//   UTF-8, no normalisation
//
// Paragraphs and not sentences because sentence boundary detection is language
// dependent, and two implementations would arrive at two different trees.
//
// Deliberately literal: "\r\n\r\n" does NOT split. Normalising line endings here would
// change the tree for every text that has them, so the caller normalises or does not.

/// @param {string} text
/// @returns {string[]} the segments, in order
export function segment(text) {
  return text
    .split("\n\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
