"use client";

import { useEffect, useState } from "react";

const COINGECKO_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,monero,zcash&vs_currencies=usd";

export type CoinId = "bitcoin" | "ethereum" | "monero" | "zcash";

export interface CoinPrices {
  bitcoin: number;
  ethereum: number;
  monero: number;
  zcash: number;
}

interface CoinGeckoPriceResponse {
  bitcoin?: { usd?: number };
  ethereum?: { usd?: number };
  monero?: { usd?: number };
  zcash?: { usd?: number };
}

export function formatCoinAmount(usd: number, priceUsd: number, coin: CoinId) {
  const amount = usd / priceUsd;
  const decimals = coin === "bitcoin" ? 6 : 4;
  return amount.toFixed(decimals);
}

export function useCoinPrices() {
  const [prices, setPrices] = useState<CoinPrices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(COINGECKO_PRICE_URL);
        if (!response.ok) {
          throw new Error(`CoinGecko responded with ${response.status}`);
        }

        const data = (await response.json()) as CoinGeckoPriceResponse;
        if (cancelled) return;

        setPrices({
          bitcoin: data.bitcoin?.usd ?? 0,
          ethereum: data.ethereum?.usd ?? 0,
          monero: data.monero?.usd ?? 0,
          zcash: data.zcash?.usd ?? 0,
        });
      } catch (fetchError) {
        console.warn("Failed to load coin prices", fetchError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function quote(usd: number, coin: CoinId) {
    const priceUsd = prices?.[coin];
    if (!priceUsd) return undefined;
    return formatCoinAmount(usd, priceUsd, coin);
  }

  return { prices, loading, quote };
}
