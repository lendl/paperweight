// The only file that imports franc. Whole-text trigram detection,
// unrestricted, returning franc's ISO 639-3 code as-is ("nld", "eng"; "und"
// is franc's own "undetermined"). Consumers decide what to do with the code.
//
// How franc behaves (from its source, v6):
// - it reads only the FIRST 2048 characters of the input;
// - its cleaner strips ASCII punctuation/digits but NOT urls, so raw urls
//   would pollute the trigrams — we strip them here;
// - francAll scores are normalized orderings, not confidences: runner-ups sit
//   at 0.95+ even on pure single-language text, so never threshold on them.
import { franc } from "franc";

// Below this, trigram detection is guesswork; report undetermined instead.
const MIN_LENGTH = 20;

export function detectLanguage(text: string): string {
  const prose = text
    .replace(/(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/\S+@\S+/g, " ")
    .trim();
  if (prose.length < MIN_LENGTH) return "und";
  if (!/\p{L}{3}/u.test(prose)) return "und";
  return franc(prose, { minLength: MIN_LENGTH });
}
