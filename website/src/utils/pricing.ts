import { IRL_CONFIG } from "@/utils/irl";

export const LICENSE_PRICING = {
  LICENSE_PRICE: 69,
  CRYPTO_PRICE: 59,
} as const;

export function getCryptoPrice() {
  return IRL_CONFIG.EVENT_ACTIVE
    ? IRL_CONFIG.EVENT_CRYPTO_PRICE
    : LICENSE_PRICING.CRYPTO_PRICE;
}

export function getCryptoPayPricing() {
  const priceUsd = getCryptoPrice();

  if (IRL_CONFIG.EVENT_ACTIVE) {
    return {
      priceUsd,
      eventLabel: IRL_CONFIG.EVENT_LABEL,
    };
  }

  return { priceUsd };
}
