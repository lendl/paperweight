import type { ActionType } from "./types";

/** GDPR case events shown in global and vendor activity logs. */
export const CASE_ACTIVITY_LOG_TYPES: ActionType[] = [
  "gdpr_request_sent",
  "case_closed",
];

// Statutory-clock milestones, in days from the case's opened_at. Shared so the
// backend nudge logic (deriveNextAction) and the CaseDetail timeline can never
// drift apart.
export const REMINDER_AFTER_DAYS = 14;
export const FOLLOWUP_AFTER_DAYS = 30;
export const ESCALATE_AFTER_DAYS = 60;
