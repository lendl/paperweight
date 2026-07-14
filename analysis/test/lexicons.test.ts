import { describe, expect, it } from "vitest";
import { LEXICONS } from "../src/data/lexicons";
import type { Lexicon } from "../src/data/lexicons";

const CATEGORIES: Array<keyof Lexicon> = [
  "purchaseConfirmation", "purchaseVocab", "updateVocab", "unsubscribeLinkText", "unsubscribeUrl",
];

describe("lexicons", () => {
  it("registers all seven languages", () => {
    expect(LEXICONS).toHaveLength(7);
  });

  it("covers every category in every language", () => {
    for (const lexicon of LEXICONS) {
      for (const category of CATEGORIES) {
        expect(lexicon[category].length, category).toBeGreaterThan(0);
      }
    }
  });

  it("no pattern matches plain English prose", () => {
    const prose =
      "in order to deliver a better experience we will keep you posted and share what changed " +
      "over the last months across the board so nothing surprises anyone anymore";
    for (const lexicon of LEXICONS) {
      for (const category of ["purchaseConfirmation", "purchaseVocab", "updateVocab"] as const) {
        for (const pattern of lexicon[category]) {
          expect(pattern.test(prose), String(pattern)).toBe(false);
        }
      }
    }
  });

  it("no pattern matches plain Dutch prose (1:1 human mail)", () => {
    const prose =
      "ik herinner me onze afspraak van vorige week nog goed en zullen we binnenkort weer een " +
      "afspraak inplannen zodra ik mijn wachtwoord weer weet stuur ik je de fotos door";
    for (const lexicon of LEXICONS) {
      for (const category of ["purchaseConfirmation", "purchaseVocab", "updateVocab"] as const) {
        for (const pattern of lexicon[category]) {
          expect(pattern.test(prose), String(pattern)).toBe(false);
        }
      }
    }
  });
});
