/**
 * Populate a second, throwaway account in the real dev userData dir with a
 * realistic-looking inbox — dozens of vendors, a mix of bulk/transactional/
 * order/personal mail, some already unsubscribed/trashed/reported, and GDPR
 * cases on a minority of vendors covering every case-lifecycle stage. Lets
 * you walk through cases, unsubscribe, dashboard and activity flows in the
 * UI without emailing real companies or touching a real inbox.
 *
 * Fake, unreachable IMAP credentials are written (same idea as
 * scripts/generate-smoke-fixture.ts) so the app treats the account as
 * connected instead of redirecting to onboarding. Sync will try once, fail
 * to reach imap.seed.invalid, and show a harmless "sync failed" banner —
 * it fails at the connect step, before touching any seeded data.
 *
 * Data is generated from a fixed seed, so re-running resets the account back
 * to the same set of vendors/messages/cases every time.
 *
 * Run via: yarn seed:test-account
 * Then switch to "test-cases@paperweight.local" from the account switcher.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createAccountDb, initDb, getDb } from "../src/main/db";
import { emailToFileKey } from "../src/main/credentials";
import {
  closeGdprCase,
  createGdprCase,
  escalateGdprCase,
  insertGdprCaseEvent,
} from "../src/main/services/cases";
import type { CategoryId, RiskLevel, MessageType, UnsubscribeMethod } from "../src/shared/types";

const TEST_EMAIL = "test-cases@paperweight.local";
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => Date.now() - Math.round(days) * DAY_MS;

// ── deterministic PRNG so reseeding is reproducible ──
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260415);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const int = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const weighted = <T extends string>(weights: Record<T, number>): T => {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [key, w] of entries) {
    if ((r -= w) <= 0) return key;
  }
  return entries[entries.length - 1][0];
};

function defaultUserDataDir(): string {
  const home = homedir();
  switch (process.platform) {
    case "darwin":
      return join(home, "Library", "Application Support", "paperweight");
    case "win32":
      return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "paperweight");
    default:
      return join(home, ".config", "paperweight");
  }
}

const userDataDir = process.argv[2] ?? defaultUserDataDir();
if (!existsSync(userDataDir)) {
  console.error(`userData dir not found: ${userDataDir} — pass it explicitly as an argument`);
  process.exit(1);
}

// ── 1. Register the account (without touching the existing accounts or activeAccount) ──

const accountsPath = join(userDataDir, "accounts.json");
const registry = existsSync(accountsPath)
  ? (JSON.parse(readFileSync(accountsPath, "utf-8")) as {
      accounts: Array<{ email: string; providerType: string; registeredAt?: number }>;
    })
  : { accounts: [] };

const idx = registry.accounts.findIndex((a) => a.email === TEST_EMAIL);
const entry = { email: TEST_EMAIL, providerType: "imap", registeredAt: Date.now() };
if (idx >= 0) registry.accounts[idx] = entry;
else registry.accounts.push(entry);
writeFileSync(accountsPath, JSON.stringify(registry, null, 2), "utf-8");

// Fake credentials so getConnectionStatus()/hasCredentials() treat this account as
// connected (skips onboarding). Plain-text: dev machines fall back to this when
// safeStorage.decryptString() fails on non-encrypted data (see loadCredentials()).
writeFileSync(
  join(userDataDir, `${emailToFileKey(TEST_EMAIL)}.enc`),
  JSON.stringify({
    providerType: "imap",
    imap: {
      host: "imap.seed.invalid",
      port: 993,
      tls: true,
      username: TEST_EMAIL,
      password: "seed-fixture-not-real",
    },
  }),
  "utf-8",
);

// ── 2. Reset this account's db file ──

const fileKey = emailToFileKey(TEST_EMAIL);
const dbPath = join(userDataDir, `${fileKey}.db`);
for (const suffix of ["", "-wal", "-shm"]) {
  const p = dbPath + suffix;
  if (existsSync(p)) rmSync(p);
}

const resourcesDir = join(process.cwd(), "resources");
initDb(
  dbPath,
  join(resourcesDir, "companies.db"),
  join(resourcesDir, "breaches.db"),
  join(resourcesDir, "enforcement.db"),
);
createAccountDb(dbPath);

const d = getDb();

// Without this marker, migrateScanScopeAllMail() (src/main/migrations.ts) treats this
// as a pre-v0.4 IMAP account on next app start and wipes every seeded message.
d.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration:all-mail-scope', '1')").run();

const CATEGORY_RISK: Record<CategoryId, RiskLevel> = {
  financial: "high",
  healthcare: "high",
  government: "high",
  social: "medium",
  marketing: "medium",
  communication: "medium",
  shopping: "low",
  entertainment: "low",
  services: "medium",
  unknown: "unknown",
};

// status is left null (unreviewed) by default, same as a freshly synced vendor.
function insertVendor(domain: string, name: string, category: CategoryId): number {
  const result = d
    .prepare(
      `INSERT INTO vendors (root_domain, name, category_id, risk_level, status)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(domain, name, category, CATEGORY_RISK[category], null);
  return Number(result.lastInsertRowid);
}

let messageSeq = 0;
function insertMessage(input: {
  vendorId: number;
  domain: string;
  daysAgo: number;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  type: MessageType;
  unsubscribeUrl?: string;
  unsubscribeMethod?: UnsubscribeMethod;
  status?: "unsubscribed" | "reported_spam" | "trashed";
  references?: string;
  id?: string;
}): string {
  const id = input.id ?? `${input.domain}-msg-${++messageSeq}`;
  d.prepare(
    `INSERT INTO messages (id, vendor_id, sender_email, sender_name, subject, date, body_preview, raw_headers, type, unsubscribe_url, unsubscribe_method, status, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.vendorId,
    input.from,
    input.fromName,
    input.subject,
    daysAgo(input.daysAgo),
    input.preview,
    input.references ? JSON.stringify({ references: input.references }) : null,
    input.type,
    input.unsubscribeUrl ?? null,
    input.unsubscribeMethod ?? null,
    input.status ?? null,
    int(400, 45000),
  );
  return id;
}

// ── Subject/preview templates by message type ──

const BULK_SUBJECTS = [
  "Your weekly digest is here",
  "20% off everything this weekend only",
  "New arrivals just for you",
  "Don't miss our biggest sale of the year",
  "Your monthly newsletter",
  "Here's what you missed",
  "Last chance: offer ends tonight",
  "Introducing our new collection",
];
const TRANSACTIONAL_SUBJECTS = [
  "Your account statement is ready",
  "Security alert: new sign-in detected",
  "Please verify your email address",
  "Your password was changed",
  "Login from a new device",
  "Your subscription will renew soon",
  "Two-factor authentication enabled",
];
const ORDER_SUBJECTS = (n: number) => [
  "Your order has shipped",
  `Order confirmation #${n}`,
  "Your receipt",
  `Delivery update: order #${n}`,
  "Your order is out for delivery",
];
const PERSONAL_SUBJECTS = [
  "Following up on your question",
  "Re: your inquiry",
  "Quick question for you",
  "Thanks for reaching out",
];
const UNKNOWN_SUBJECTS = ["Update", "(no subject)", "Info", "Notice"];

const SENDER_LOCAL_PARTS: Record<MessageType, string[]> = {
  bulk: ["newsletter", "hello", "news"],
  transactional: ["noreply", "security", "account"],
  order: ["orders", "shipping", "receipts"],
  personal: ["support", "hello", "team"],
  unknown: ["info", "noreply"],
};

function subjectFor(type: MessageType): string {
  switch (type) {
    case "bulk":
      return pick(BULK_SUBJECTS);
    case "transactional":
      return pick(TRANSACTIONAL_SUBJECTS);
    case "order":
      return pick(ORDER_SUBJECTS(int(1000, 9999)));
    case "personal":
      return pick(PERSONAL_SUBJECTS);
    default:
      return pick(UNKNOWN_SUBJECTS);
  }
}

const PREVIEW_SNIPPETS: Record<MessageType, string[]> = {
  bulk: [
    "Hi there — here's what's new this week. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tap below to shop the collection.",
    "Don't miss out: limited-time offers inside. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Your curated picks are ready. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  ],
  transactional: [
    "We noticed a new sign-in to your account. If this was you, no action is needed. Otherwise reset your password immediately.",
    "Please verify your email address by clicking the link below. This link expires in 24 hours.",
    "Your security settings were updated. Review recent activity in your account dashboard.",
  ],
  order: [
    "Good news — your order is on its way. Track your package using the link below. Estimated delivery: 2–4 business days.",
    "Thanks for your purchase. Your receipt is attached. Items will ship within 1–2 business days.",
    "Your order has been confirmed. We'll email you again when it ships.",
  ],
  personal: [
    "Thanks for reaching out. We're looking into your question and will get back to you shortly.",
    "Following up on your message — could you share a few more details so we can help?",
    "Hi — just checking in regarding your recent inquiry.",
  ],
  unknown: [
    "Please see the information below. Contact support if you have questions.",
    "This is an automated notice regarding your account.",
  ],
};

function previewFor(type: MessageType): string {
  return pick(PREVIEW_SNIPPETS[type]);
}

type Profile = "newsletter" | "account" | "shop" | "mixed";

const PROFILE_WEIGHTS: Record<Profile, Record<MessageType, number>> = {
  newsletter: { bulk: 0.85, personal: 0.05, unknown: 0.1, transactional: 0, order: 0 },
  account: { transactional: 0.6, order: 0.05, personal: 0.2, unknown: 0.15, bulk: 0 },
  shop: { order: 0.45, bulk: 0.35, transactional: 0.1, personal: 0.1, unknown: 0 },
  mixed: { personal: 0.4, transactional: 0.3, bulk: 0.2, unknown: 0.1, order: 0 },
};

const PROFILE_COUNT_RANGE: Record<Profile, [number, number]> = {
  newsletter: [20, 120],
  account: [8, 40],
  shop: [15, 80],
  mixed: [5, 30],
};

const UNSUB_METHOD_WEIGHTS: Record<UnsubscribeMethod, number> = {
  rfc8058: 0.3,
  "list-unsubscribe": 0.4,
  footer: 0.2,
  none: 0.1,
};

// Populates a vendor's inbox and derives its stats/flags from the messages
// actually inserted, same as a real sync would.
function seedInbox(vendorId: number, domain: string, profile: Profile, alreadyActioned: boolean): void {
  const weights = PROFILE_WEIGHTS[profile];
  const [minCount, maxCount] = PROFILE_COUNT_RANGE[profile];
  const count = int(minCount, maxCount);
  const ageDays = int(60, 720);

  const bulkIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const type = weighted(weights);
    const daysBack = rng() * ageDays;
    const from = `${pick(SENDER_LOCAL_PARTS[type])}@${domain}`;
    const hasUnsub = type === "bulk" && rng() < 0.8;
    const method = hasUnsub ? weighted(UNSUB_METHOD_WEIGHTS) : undefined;
    const id = insertMessage({
      vendorId,
      domain,
      daysAgo: daysBack,
      from,
      fromName: pick([domain.split(".")[0], "Support Team", "No Reply"]),
      subject: subjectFor(type),
      preview: previewFor(type),
      type,
      unsubscribeUrl: hasUnsub ? `https://${domain}/unsubscribe?u=${int(1000, 99999)}` : undefined,
      unsubscribeMethod: method,
    });
    if (type === "bulk") bulkIds.push(id);
  }

  if (alreadyActioned && bulkIds.length > 0) {
    const actionedCount = Math.max(1, Math.floor(bulkIds.length * 0.3));
    const actioned = bulkIds.slice(0, actionedCount);
    for (const id of actioned) {
      d.prepare("UPDATE messages SET status = 'unsubscribed' WHERE id = ?").run(id);
    }
    d.prepare(
      `INSERT INTO action_log (vendor_id, action_type, message_count, actioned_at)
       VALUES (?, 'unsubscribed', ?, ?)`,
    ).run(vendorId, actioned.length, daysAgo(int(1, 20)));
  }

  recomputeVendorStatsAndFlags(vendorId);
}

// Mirrors updateVendorStats/updateVendorFlags in src/main/services/vendors.ts —
// duplicated here to avoid pulling that module's heavier import chain into this script.
function recomputeVendorStatsAndFlags(vendorId: number): void {
  const stats = d
    .prepare(
      `SELECT COUNT(*) as message_count, COUNT(DISTINCT sender_email) as sender_count,
              MIN(date) as first_seen, MAX(date) as last_seen,
              MAX(CASE WHEN type = 'bulk' THEN 1 ELSE 0 END) as has_marketing,
              MAX(CASE WHEN type IN ('transactional', 'order') THEN 1 ELSE 0 END) as has_account
       FROM messages WHERE vendor_id = ?`,
    )
    .get(vendorId) as {
    message_count: number;
    sender_count: number;
    first_seen: number | null;
    last_seen: number | null;
    has_marketing: number;
    has_account: number;
  };
  d.prepare(
    `UPDATE vendors SET message_count = ?, sender_count = ?, first_seen = ?, last_seen = ?, has_marketing = ?, has_account = ?
     WHERE id = ?`,
  ).run(
    stats.message_count,
    stats.sender_count,
    stats.first_seen,
    stats.last_seen,
    stats.has_marketing ?? 0,
    stats.has_account ?? 0,
    vendorId,
  );
}

// ── Vendors with no GDPR case — just inbox variety ──

const NO_CASE_VENDORS: Array<{ name: string; domain: string; category: CategoryId; profile: Profile; actioned?: boolean }> = [
  { name: "Glowreel Studios", domain: "glowreel-studios.test", category: "entertainment", profile: "newsletter", actioned: true },
  { name: "Popstream Media", domain: "popstream-media.test", category: "entertainment", profile: "newsletter" },
  { name: "Chatterly Social", domain: "chatterly-social.test", category: "social", profile: "newsletter", actioned: true },
  { name: "Looply Network", domain: "looply-network.test", category: "social", profile: "newsletter" },
  { name: "Friendline Connect", domain: "friendline-connect.test", category: "social", profile: "mixed" },
  { name: "Pulse Marketing Co", domain: "pulse-marketing.test", category: "marketing", profile: "newsletter", actioned: true },
  { name: "Brightloop Insights", domain: "brightloop-insights.test", category: "marketing", profile: "newsletter" },
  { name: "Northgate Media Group", domain: "northgate-media.test", category: "marketing", profile: "newsletter" },
  { name: "Reachwell Digital", domain: "reachwell-digital.test", category: "marketing", profile: "newsletter", actioned: true },
  { name: "Ringway Telecom", domain: "ringway-telecom.test", category: "communication", profile: "account" },
  { name: "Signalhouse Mobile", domain: "signalhouse-mobile.test", category: "communication", profile: "account" },
  { name: "Telko Communications", domain: "telko-communications.test", category: "communication", profile: "account" },
  { name: "Meridian Bank", domain: "meridian-bank.test", category: "financial", profile: "account" },
  { name: "Sterling Capital", domain: "sterling-capital.test", category: "financial", profile: "account" },
  { name: "Vault Trust Financial", domain: "vault-trust.test", category: "financial", profile: "account" },
  { name: "Ledger Finance Group", domain: "ledger-finance.test", category: "financial", profile: "account" },
  { name: "Everwell Health", domain: "everwell-health.test", category: "healthcare", profile: "account" },
  { name: "Vitalis Medical", domain: "vitalis-medical.test", category: "healthcare", profile: "account" },
  { name: "Careline Clinic", domain: "careline-clinic.test", category: "healthcare", profile: "mixed" },
  { name: "Cityline Services", domain: "cityline-services.test", category: "government", profile: "account" },
  { name: "Countywide Registry", domain: "countywide-registry.test", category: "government", profile: "account" },
  { name: "Boltwood Market", domain: "boltwood-market.test", category: "shopping", profile: "shop" },
  { name: "Driftwood Goods", domain: "driftwood-goods.test", category: "shopping", profile: "shop", actioned: true },
  { name: "Amberfield Outfitters", domain: "amberfield-outfitters.test", category: "shopping", profile: "shop" },
  { name: "Palewick Store", domain: "palewick-store.test", category: "shopping", profile: "shop" },
  { name: "Thistledown Retail", domain: "thistledown-retail.test", category: "shopping", profile: "shop", actioned: true },
  { name: "Millbrook Goods", domain: "millbrook-goods.test", category: "shopping", profile: "shop" },
  { name: "Rosemont Market", domain: "rosemont-market.test", category: "shopping", profile: "shop" },
  { name: "Oakhollow General Store", domain: "oakhollow-general.test", category: "shopping", profile: "shop" },
  { name: "Wrenfield Supplies", domain: "wrenfield-supplies.test", category: "services", profile: "mixed" },
  { name: "Hollowmere Solutions", domain: "hollowmere-solutions.test", category: "services", profile: "mixed" },
  { name: "Aldergate Logistics", domain: "aldergate-logistics.test", category: "services", profile: "mixed" },
];

for (const v of NO_CASE_VENDORS) {
  const vendorId = insertVendor(v.domain, v.name, v.category);
  seedInbox(vendorId, v.domain, v.profile, v.actioned ?? false);
}

// ── Vendors with a GDPR case — one per lifecycle stage, plus a normal inbox ──

function vendorWithCase(
  name: string,
  domain: string,
  category: CategoryId,
  profile: Profile,
): number {
  const vendorId = insertVendor(domain, name, category);
  seedInbox(vendorId, domain, profile, false);
  return vendorId;
}

// 1. fresh case, too early for any nudge
{
  const vendorId = vendorWithCase("Northstar Cloud", "northstar-cloud.test", "services", "account");
  createGdprCase({
    vendorId,
    requestType: "access",
    recipientEmail: "privacy@northstar-cloud.test",
    subject: "Subject Access Request",
    body: "Please provide a copy of the personal data you hold on me.",
    sentMessageId: "<req-northstar@paperweight>",
    openedAt: daysAgo(5),
  });
}

// 2. reminder due (>=14 days, nothing sent yet)
{
  const vendorId = vendorWithCase("Bramblewood Retail", "bramblewood-retail.test", "shopping", "shop");
  createGdprCase({
    vendorId,
    requestType: "deletion",
    recipientEmail: "support@bramblewood-retail.test",
    subject: "Data Deletion Request",
    body: "Please delete all personal data you hold on me.",
    sentMessageId: "<req-bramblewood@paperweight>",
    openedAt: daysAgo(20),
  });
}

// 3. follow-up due (>=30 days, reminder already sent)
{
  const vendorId = vendorWithCase("Coldharbor Analytics", "coldharbor-analytics.test", "marketing", "newsletter");
  const kase = createGdprCase({
    vendorId,
    requestType: "access",
    recipientEmail: "privacy@coldharbor-analytics.test",
    subject: "Subject Access Request",
    body: "Please provide a copy of the personal data you hold on me.",
    sentMessageId: "<req-coldharbor@paperweight>",
    openedAt: daysAgo(35),
  });
  insertGdprCaseEvent(kase.id, "reminder_sent", { subject: "Reminder: Subject Access Request" });
}

// 4. overdue, escalate (>=60 days)
{
  const vendorId = vendorWithCase("Duskfall Logistics", "duskfall-logistics.test", "services", "mixed");
  createGdprCase({
    vendorId,
    requestType: "deletion",
    recipientEmail: "dpo@duskfall-logistics.test",
    subject: "Data Deletion Request",
    body: "Please delete all personal data you hold on me.",
    sentMessageId: "<req-duskfall@paperweight>",
    openedAt: daysAgo(65),
  });
}

// 5. auto-responder received — informational only (no thread match)
{
  const vendorId = vendorWithCase("Emberlin Health", "emberlin-health.test", "healthcare", "account");
  createGdprCase({
    vendorId,
    requestType: "access",
    recipientEmail: "privacy@emberlin-health.test",
    subject: "Subject Access Request",
    body: "Please provide a copy of the personal data you hold on me.",
    sentMessageId: "<req-emberlin@paperweight>",
    openedAt: daysAgo(10),
  });
  insertMessage({
    vendorId,
    domain: "emberlin-health.test",
    daysAgo: 9,
    from: "privacy@emberlin-health.test",
    fromName: "Emberlin Health Privacy Team",
    subject: "We've received your request",
    preview: "Thank you for contacting us. We've received your request and will respond within 30 days.",
    type: "personal",
    id: "msg-emberlin-ack",
  });
}

// 6. thread-matched reply — auto-added to case file on open
{
  const vendorId = vendorWithCase("Fennimore Media", "fennimore-media.test", "entertainment", "newsletter");
  createGdprCase({
    vendorId,
    requestType: "deletion",
    recipientEmail: "support@fennimore-media.test",
    subject: "Data Deletion Request",
    body: "Please delete all personal data you hold on me.",
    sentMessageId: "<req-fennimore@paperweight>",
    openedAt: daysAgo(12),
  });
  insertMessage({
    vendorId,
    domain: "fennimore-media.test",
    daysAgo: 3,
    from: "support@fennimore-media.test",
    fromName: "Fennimore Media Support",
    subject: "Re: Data Deletion Request",
    preview: "We've located your account and completed the deletion. Let us know if you have questions.",
    type: "personal",
    references: "<req-fennimore@paperweight>",
    id: "msg-fennimore-reply",
  });
}

// 7. closed — resolved
{
  const vendorId = vendorWithCase("Glasswick Insurance", "glasswick-insurance.test", "financial", "account");
  const kase = createGdprCase({
    vendorId,
    requestType: "access",
    recipientEmail: "privacy@glasswick-insurance.test",
    subject: "Subject Access Request",
    body: "Please provide a copy of the personal data you hold on me.",
    sentMessageId: "<req-glasswick@paperweight>",
    openedAt: daysAgo(45),
  });
  closeGdprCase(kase.id, "resolved");
}

// 8. closed — resolved (user gave up waiting)
{
  const vendorId = vendorWithCase("Harrowgate Foods", "harrowgate-foods.test", "shopping", "shop");
  const kase = createGdprCase({
    vendorId,
    requestType: "deletion",
    recipientEmail: "hello@harrowgate-foods.test",
    subject: "Data Deletion Request",
    body: "Please delete all personal data you hold on me.",
    sentMessageId: "<req-harrowgate@paperweight>",
    openedAt: daysAgo(70),
  });
  closeGdprCase(kase.id);
}

// 9. closed — escalated
{
  const vendorId = vendorWithCase("Marrowgate Utilities", "marrowgate-utilities.test", "services", "account");
  const kase = createGdprCase({
    vendorId,
    requestType: "access",
    recipientEmail: "privacy@marrowgate-utilities.test",
    subject: "Subject Access Request",
    body: "Please provide a copy of the personal data you hold on me.",
    sentMessageId: "<req-marrowgate@paperweight>",
    openedAt: daysAgo(90),
  });
  escalateGdprCase(kase.id);
}

// 10. no case yet — starting point for "start a new case"
{
  const vendorId = insertVendor("juniper-outfitters.test", "Juniper Outfitters", "shopping");
  seedInbox(vendorId, "juniper-outfitters.test", "shop", false);
}

// 11. thread-matched reply pending auto-sync on case open
{
  const vendorId = vendorWithCase("Kestrel Finance", "kestrel-finance.test", "financial", "account");
  createGdprCase({
    vendorId,
    requestType: "access",
    recipientEmail: "privacy@kestrel-finance.test",
    subject: "Subject Access Request",
    body: "Please provide a copy of the personal data you hold on me.",
    sentMessageId: "<req-kestrel@paperweight>",
    openedAt: daysAgo(6),
  });
  insertMessage({
    vendorId,
    domain: "kestrel-finance.test",
    daysAgo: 2,
    from: "privacy@kestrel-finance.test",
    fromName: "Kestrel Finance Privacy",
    subject: "Re: Subject Access Request",
    preview: "Attached is the data export you requested.",
    type: "personal",
    references: "<req-kestrel@paperweight>",
    id: "msg-kestrel-candidate",
  });
}

// 12. other vendor email since request — shown in overview only
{
  const vendorId = vendorWithCase("Larkspur Wellness", "larkspur-wellness.test", "healthcare", "mixed");
  createGdprCase({
    vendorId,
    requestType: "deletion",
    recipientEmail: "care@larkspur-wellness.test",
    subject: "Data Deletion Request",
    body: "Please delete all personal data you hold on me.",
    sentMessageId: "<req-larkspur@paperweight>",
    openedAt: daysAgo(9),
  });
  insertMessage({
    vendorId,
    domain: "larkspur-wellness.test",
    daysAgo: 1,
    from: "care@larkspur-wellness.test",
    fromName: "Larkspur Wellness Care Team",
    subject: "Your appointment reminder",
    preview: "This is a reminder about your upcoming appointment.",
    type: "personal",
    id: "msg-larkspur-candidate",
  });
}

const totalVendors = (d.prepare("SELECT COUNT(*) c FROM vendors").get() as { c: number }).c;
const totalCases = (d.prepare("SELECT COUNT(*) c FROM gdpr_cases").get() as { c: number }).c;
const totalMessages = (d.prepare("SELECT COUNT(*) c FROM messages").get() as { c: number }).c;

console.info(`Seeded ${TEST_EMAIL} [${fileKey}] in ${userDataDir}`);
console.info(`${totalVendors} vendors, ${totalMessages} messages, ${totalCases} GDPR cases.`);
console.info(`Switch to it from the account switcher — the one sync attempt will fail harmlessly (fake host).`);
console.info(`Re-run this script any time to reset it back to this same data.`);
