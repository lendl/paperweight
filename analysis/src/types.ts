// Public types of @paperweight/analysis. Source of truth: ENGINE_DESIGN.md §2–3.

export interface RawMessage {
  headers: Record<string, string | string[]>;
  html?: string;
  text?: string;
}

export interface AnalyzeOptions {
  ownIdentifiers?: { emails?: string[] };
  caseContext?: { vendorDomain: string };
  locale?: string;
}

// 'unknown' is reserved for empty/unparseable input; the classifier otherwise
// always emits its best guess with a confidence.
export type MessageType = "bulk" | "transactional" | "order" | "personal" | "unknown";

export type UnsubscribeMethod = "rfc8058" | "list-unsubscribe" | "footer";

export interface Signal {
  id: string;
  detail?: string;
}

export type FindingType =
  | "email"
  | "iban"
  | "credit_card"
  | "national_id"
  | "phone"
  | "postal_code"
  | "address";

// verified: real checksum passed (Luhn, mod-97, elfproef, ...)
// pattern: strict distinctive format, no checksum exists
// contextual: heuristic that needed surrounding context to qualify
export type Confidence = "verified" | "pattern" | "contextual";

export interface Finding {
  type: FindingType;
  valueRaw: string;
  valueNormalized: string;
  start: number;
  end: number;
  confidence: Confidence;
  country?: string;
  signals: Signal[];
  inQuotedText?: boolean;
  isOwnIdentifier?: boolean;
}

export interface TextAnalysis {
  lang: string; // ISO 639-3 straight from detection ("eng", "nld"); "und" = undetermined
  findings: Finding[];
  textSignals: Signal[];
}

export interface GdprReplyResult {
  kind:
    | "acknowledgement"
    | "verification_request"
    | "clarification_request"
    | "extension_notice"
    | "refusal"
    | "fulfilled"
    | "unrelated";
  confidence: number;
  extractedDeadline?: string;
  signals: Signal[];
}

export interface Analysis extends TextAnalysis {
  type: MessageType;
  typeConfidence: number;
  typeSignals: Signal[];
  unsubscribe?: { method: UnsubscribeMethod; target: string };
  vendor?: { domain: string; dkimDomain?: string; displayName?: string };
  gdprReply?: GdprReplyResult;
  version: string;
}
