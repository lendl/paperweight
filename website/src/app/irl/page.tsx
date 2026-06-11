import Link from "next/link";
import { LiveCaptureDemo } from "@/components/irl/LiveCaptureDemo";
import { IrlCtaSection } from "@/components/irl/IrlCtaSection";
import { jetbrainsMono } from "@/app/irl/fonts";
import { SITE_CONFIG } from "@/utils/config";

const SECTION_GAP = "mt-12";
const CONTENT_GAP = "gap-10";

const FEATURES = [
  { title: "Bulk unsubscribe", description: "Find and drop marketing lists in minutes." },
  { title: "Account inventory", description: "See which vendors and services hold your data." },
  { title: "Breach alerts", description: "Know when companies you use get breached." },
  { title: "GDPR deletion support", description: "Generate deletion requests to cut exposure." },
] as const;

const BADGES = ["Local-first", "Privacy-respecting", "Open-source"] as const;

export default function IrlPage() {
  return (
    <>
      <div className={jetbrainsMono.className}>
        <LiveCaptureDemo />
      </div>

      <div className={`${SECTION_GAP} flex flex-col ${CONTENT_GAP}`}>
        <div className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold text-primary leading-tight">
            Your inbox knows where your data lives.
          </h2>
          <p className="opacity-80">
            Every account you create, every service you sign up for, every online purchase
            is connected to your email address. Most people have 100+ accounts they&apos;ve
            forgotten about, creating security risks and privacy exposure.
          </p>
          <p className="opacity-80">
            Paperweight scans your inbox to map your digital footprint, then helps you
            take back control and delete your data.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Features</h2>
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3 text-sm leading-relaxed opacity-80">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>
                  <span className="font-semibold opacity-100">{feature.title}</span>
                  {" — "}
                  {feature.description}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {BADGES.map((badge) => (
              <span key={badge} className="badge badge-outline badge-primary badge-sm">
                {badge}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm opacity-80">
            <span className="font-semibold text-base-content">Don&apos;t trust, verify</span>
            {" — "}
            <Link
              href={SITE_CONFIG.GITHUB_URL}
              className="link link-accent"
              target="_blank"
              rel="noopener noreferrer"
            >
              check source on GitHub
            </Link>
          </p>
        </section>
      </div>

      <div className={SECTION_GAP}>
        <IrlCtaSection />
      </div>

      <section className={`${SECTION_GAP} space-y-2 text-sm leading-relaxed opacity-80`}>
        <h2 className="text-xl font-semibold opacity-100">👋 Say hi</h2>
        <p>I&apos;m around at Berlin Blockchain Week.</p>
        <p>
          Signal: <span className="font-medium text-base-content">wslyvh.42</span> or {" "}
          <a
            href="https://t.me/wslyvh"
            className="link link-accent font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegram
          </a>
        </p>
      </section>
    </>
  );
}
