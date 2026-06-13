"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ActionCard } from "@/components/ActionCard";
import { PayWithCryptoButton } from "@/components/PayWithCrypto";
import { SITE_CONFIG } from "@/utils/config";
import { IRL_CONFIG } from "@/utils/irl";

export function IrlCtaSection() {
  return (
    <section id="get-it">
      <ActionCard
        icon={<Sparkles className="h-5 w-5" />}
        title="A tool you own"
        description={
          <>
            Paperweight is a free, open-source desktop app (MIT). But you can support
            open-source software by buying a perpetual license. This unlocks unlimited sync history, multi-account, and all V1 updates.
            One-time purchase, permanent use and no hidden fees. It passes the{" "}
            <Link
              href="https://x.com/VitalikButerin/status/2010621884811845708"
              className="link link-accent"
              target="_blank"
              rel="noopener noreferrer"
            >
              walk-away test
            </Link>
            .
          </>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap mt-2">
          <PayWithCryptoButton
            pricing={{ priceUsd: IRL_CONFIG.CRYPTO_PRICE }}
            className="btn btn-primary plausible-event-name=IRL+Pay+Crypto"
          >
            Pay with crypto (${IRL_CONFIG.CRYPTO_PRICE})
          </PayWithCryptoButton>
          <a
            href={SITE_CONFIG.LICENSE_URL}
            className="btn btn-ghost plausible-event-name=IRL+Pay+Card"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay with card (${IRL_CONFIG.LICENSE_PRICE})
          </a>
        </div>
        <p className="text-sm opacity-60">
          *${IRL_CONFIG.CRYPTO_PRICE} crypto rate during {IRL_CONFIG.EVENT_LABEL} only.
        </p>
      </ActionCard>
    </section>
  );
}
