import { textTypeSignals } from "./classify/text-signals";
import { classifyType } from "./classify/type";
import { resolveUnsubscribe } from "./classify/unsubscribe";
import { extract } from "./extract/body";
import { detectLanguage } from "./extract/language";
import type { Analysis, AnalyzeOptions, RawMessage, TextAnalysis } from "./types";

export * from "./types";
export { parseEml } from "./parse/eml";

// Stays 0.1.0 during development; versioning starts when the app consumes the
// engine (the caller re-scans when this changes).
export const ENGINE_VERSION = "0.1.0";

// Findings land in step 4 per ENGINE_DESIGN.md §9; the empty array is honest,
// not a placeholder.

export function analyzeText(text: string, opts?: AnalyzeOptions): TextAnalysis {
  return { lang: detectLanguage(text), findings: [] };
}

export function analyzeMessage(msg: RawMessage, opts?: AnalyzeOptions): Analysis {
  const extracted = extract(msg);
  const textAnalysis = analyzeText(extracted.body.text, opts);
  const unsubscribe = resolveUnsubscribe(extracted.header, extracted.body);
  const type = classifyType(extracted, textTypeSignals(extracted.body.text), unsubscribe);
  const analysis: Analysis = {
    ...textAnalysis,
    type: type.type,
    typeConfidence: type.confidence,
    typeSignals: type.signals,
    version: ENGINE_VERSION,
  };
  if (unsubscribe) analysis.unsubscribe = unsubscribe;
  return analysis;
}
