export const PAYMENT_ADDRESSES = {
  fluidkeyEns: process.env.NEXT_PUBLIC_PAYMENT_FLUIDKEY_ENS ?? "",
  fluidkeyHostedUrl: process.env.NEXT_PUBLIC_PAYMENT_FLUIDKEY_HOSTED_URL ?? "",
  bitcoinSp1: process.env.NEXT_PUBLIC_PAYMENT_BITCOIN_SP1 ?? "",
  bitcoinRegular: process.env.NEXT_PUBLIC_PAYMENT_BITCOIN_REGULAR ?? "",
  zcash: process.env.NEXT_PUBLIC_PAYMENT_ZCASH ?? "",
  monero: process.env.NEXT_PUBLIC_PAYMENT_MONERO ?? "",
};
