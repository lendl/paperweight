import { describe, expect, it } from "vitest";
import { analyzeMessage, parseEml } from "../src/index";
import { analysisMismatches, loadFixtureCases } from "./harness";

const cases = loadFixtureCases();

describe("fixtures", () => {
  it("finds at least one fixture", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const fixture of cases) {
    it(fixture.name, async () => {
      const message =
        fixture.input.kind === "eml" ? await parseEml(fixture.input.raw) : fixture.input.message;
      const analysis = analyzeMessage(message, fixture.options);
      expect(analysisMismatches(analysis, fixture.expected)).toEqual([]);
    });
  }
});
