"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { collectClientSignals, type ClientSignals } from "@/components/irl/signals";

type DemoPhase =
  | "loading"
  | "typing"
  | "exfilJson"
  | "exfilBroadcast"
  | "exfilMuted"
  | "settled";

const BROADCAST_PARTNERS = 42;
const EXFIL_JSON_SECONDS = 5;
const BROADCAST_DURATION_MS = 5000;

interface SignalRow {
  label: string;
  value: string;
  kind?: "redacted" | "fingerprint";
  redactedPreview?: string;
}

function buildRows(signals: ClientSignals): SignalRow[] {
  return [
    { label: "OS", value: signals.os },
    { label: "Browser", value: signals.browser },
    { label: "Language", value: signals.language },
    { label: "Timezone", value: signals.timezone },
    { label: "Screen", value: signals.screen },
    { label: "Color scheme", value: signals.colorScheme },
    { label: "GPU", value: signals.gpu },
    { label: "CPU cores", value: signals.cpuCores },
    { label: "Touch points", value: signals.touchPoints },
    { label: "Cookies", value: signals.cookies },
    { label: "Do Not Track", value: signals.doNotTrack },
    { label: "Entry", value: "direct (QR)" },
    {
      label: "IP / geo",
      value: "(redacted)",
      kind: "redacted",
      redactedPreview: "███.███.███.███",
    },
    { label: "Fingerprint", value: signals.fingerprint, kind: "fingerprint" },
  ];
}

function typingDelay(index: number): number {
  if (index < 3) return 420;
  if (index < 7) return 300;
  if (index < 11) return 200;
  return 140;
}

export function LiveCaptureDemo() {
  const [demoKey, setDemoKey] = useState(0);
  const [signals, setSignals] = useState<ClientSignals | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>("loading");
  const [exfilSeconds, setExfilSeconds] = useState(EXFIL_JSON_SECONDS);
  const [partnerCount, setPartnerCount] = useState(0);

  const rows = useMemo(
    () => (signals ? buildRows(signals) : []),
    [signals],
  );

  function handleReplay() {
    setSignals(null);
    setVisibleCount(0);
    setPhase("loading");
    setExfilSeconds(EXFIL_JSON_SECONDS);
    setPartnerCount(0);
    setDemoKey((key) => key + 1);
  }

  useEffect(() => {
    let cancelled = false;

    collectClientSignals().then((result) => {
      if (!cancelled) {
        setSignals(result);
        setPhase("typing");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [demoKey]);

  useEffect(() => {
    if (phase !== "typing" || !signals) return;

    if (visibleCount >= rows.length) {
      const timer = window.setTimeout(() => setPhase("exfilJson"), 500);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((count) => count + 1);
    }, typingDelay(visibleCount));

    return () => window.clearTimeout(timer);
  }, [phase, visibleCount, rows.length, signals]);

  useEffect(() => {
    if (phase !== "exfilJson") return;

    setExfilSeconds(EXFIL_JSON_SECONDS);

    const countdown = window.setInterval(() => {
      setExfilSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(countdown);
          setPhase("exfilBroadcast");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdown);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exfilBroadcast") return;

    setPartnerCount(0);
    const startedAt = Date.now();

    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(
        BROADCAST_PARTNERS,
        Math.round((elapsed / BROADCAST_DURATION_MS) * BROADCAST_PARTNERS),
      );
      setPartnerCount(next);

      if (next >= BROADCAST_PARTNERS) {
        window.clearInterval(tick);
        window.setTimeout(() => setPhase("exfilMuted"), 400);
      }
    }, 50);

    return () => window.clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exfilMuted") return;
    const timer = window.setTimeout(() => setPhase("settled"), 500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const isLive =
    phase === "loading"
    || phase === "typing"
    || phase === "exfilJson"
    || phase === "exfilBroadcast";
  const showExfil =
    phase === "exfilJson"
    || phase === "exfilBroadcast"
    || phase === "exfilMuted"
    || phase === "settled";
  const showBroadcast =
    phase === "exfilBroadcast"
    || phase === "exfilMuted"
    || phase === "settled";
  const exfilMuted = phase === "exfilMuted" || phase === "settled";
  const showReveal = phase === "settled";
  const exfilLineClass = exfilMuted ? "text-sm opacity-45" : "text-sm text-primary";
  const broadcastPercent = Math.round((partnerCount / BROADCAST_PARTNERS) * 100);

  return (
    <section>
      <h1 className="mb-2 text-[clamp(1.6rem,5vw,2rem)] font-bold leading-tight">
        You just scanned a QR code.
      </h1>
      <p className="mb-6 opacity-65">Here&apos;s what that handed over.</p>

      <div className="card card-border border-base-content/15 bg-base-300 shadow-lg">
        <div className="flex items-center justify-between gap-4 border-b border-base-content/15 px-4 py-3 text-[0.72rem] tracking-wide">
          <span className={`inline-flex items-center gap-2 font-medium ${exfilMuted ? "opacity-45" : "text-primary"}`}>
            <span
              className={[
                "size-2 rounded-full bg-primary shadow-[0_0_8px] shadow-primary",
                isLive ? "animate-pulse" : "",
                exfilMuted ? "opacity-50 shadow-none" : "",
              ].join(" ")}
              aria-hidden
            />
            LIVE CAPTURE
          </span>
          <span className="lowercase opacity-50">
            {phase === "loading" && "initializing..."}
            {phase === "typing" && "harvesting..."}
            {phase === "exfilJson" && "exfiltrating..."}
            {phase === "exfilBroadcast" && "broadcasting..."}
            {(phase === "exfilMuted" || phase === "settled") && "complete"}
          </span>
        </div>

        <div className="min-h-48 px-4 py-3" aria-live="polite">
          {phase === "loading" && (
            <p className="text-sm opacity-55">reading client signals...</p>
          )}

          {rows.slice(0, visibleCount).map((row) => (
            <div key={row.label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-1.5 text-sm">
              <span className="opacity-50">{row.label}</span>
              <span
                className={[
                  "break-words",
                  row.kind === "fingerprint" ? "font-medium text-primary" : "",
                  row.kind === "redacted" ? "inline-flex items-center gap-2" : "",
                ].join(" ")}
              >
                {row.kind === "redacted" ? (
                  <>
                    <span className="font-mono text-base-content/40">{row.redactedPreview}</span>
                    <span>{row.value}</span>
                  </>
                ) : (
                  row.value
                )}
              </span>
            </div>
          ))}

          {visibleCount >= 8 && (
            <p className="mt-1 text-xs opacity-45">+ 34 more signals...</p>
          )}
        </div>

        {showExfil && (
          <div className="border-t border-base-content/15 px-4 py-3 space-y-2">
            <p className={exfilLineClass}>
              {`> Exfiltrating ${signals?.fingerprint ?? "fingerprint"}.json… ${phase === "exfilJson" ? `${exfilSeconds}s` : "0s"}`}
            </p>

            {showBroadcast && (
              <>
                <p className={exfilLineClass}>
                  {`> Broadcasting to ${partnerCount} partners`}
                </p>
                <progress
                  className={[
                    "progress h-1.5 w-full",
                    exfilMuted ? "progress-neutral opacity-40" : "progress-primary",
                  ].join(" ")}
                  value={broadcastPercent}
                  max={100}
                  aria-hidden
                />
                <div className={`flex justify-between gap-4 text-xs ${exfilMuted ? "opacity-35" : "opacity-55"}`}>
                  <span>Stripe · AWS · Meta · data brokers ...</span>
                  <span>{broadcastPercent}%</span>
                </div>
              </>
            )}
          </div>
        )}

        {showReveal && (
          <div className="mx-4 mb-4 mt-6 rounded-lg border border-base-content/15 bg-base-200/60 p-3.5">
            <p className="text-sm font-medium">
              Just kidding. We don&apos;t track you...
            </p>
            <p className="mt-2 text-xs leading-relaxed opacity-65">
              None of this was actually stored. No cookies, no IP lookups, or fingerprints that follow you.
              We help you reclaim your privacy.
            </p>
          </div>
        )}
      </div>

      {phase === "settled" && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleReplay}
            className="btn btn-ghost btn-xs btn-square opacity-60 hover:opacity-100"
            aria-label="Replay capture demo"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
