import { extract } from "./extract/body";
import { detectLanguage } from "./extract/language";
import type { Analysis, AnalyzeOptions, RawMessage, TextAnalysis } from "./types";

export * from "./types";
export { parseEml } from "./parse/eml";

// Stays 0.1.0 during development; versioning starts when the app consumes the
// engine (the caller re-scans when this changes).
export const ENGINE_VERSION = "0.1.0";

// Findings, text signals, and classification land step by step per
// ENGINE_DESIGN.md §9; empty results here are honest, not placeholders.

export function analyzeText(text: string, opts?: AnalyzeOptions): TextAnalysis {
  return { lang: detectLanguage(text), findings: [], textSignals: [] };
}

export function analyzeMessage(msg: RawMessage, opts?: AnalyzeOptions): Analysis {
  const extracted = extract(msg);
  const textAnalysis = analyzeText(extracted.body.text, opts);
  return {
    ...textAnalysis,
    type: "unknown",
    typeConfidence: 0,
    typeSignals: [],
    version: ENGINE_VERSION,
  };
}
