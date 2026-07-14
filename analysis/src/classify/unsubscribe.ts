// Unsubscribe resolution: rfc8058 > list-unsubscribe > footer link
// (ENGINE_DESIGN.md §4). Header facts and the body link list are the inputs;
// the prose text is never searched. Footer links are matched on anchor text
// first, then on the href itself (generic "click here" links), bottom-up.
import { UNSUBSCRIBE_LINK_TEXT, UNSUBSCRIBE_URL } from "../data/lexicons";
import type { ExtractedBody } from "../extract/body";
import type { HeaderFacts } from "../extract/headers";
import type { UnsubscribeMethod } from "../types";

export interface UnsubscribeResult {
  method: UnsubscribeMethod;
  target: string;
}

export function resolveUnsubscribe(header: HeaderFacts, body: ExtractedBody): UnsubscribeResult | undefined {
  const urls = header.listUnsubscribe?.urls ?? [];
  const mailtos = header.listUnsubscribe?.mailtos ?? [];

  if (header.listUnsubscribePost && urls[0]) return { method: "rfc8058", target: urls[0] };
  if (urls[0]) return { method: "list-unsubscribe", target: urls[0] };
  if (mailtos[0]) return { method: "list-unsubscribe", target: mailtos[0] };

  // Footer links live at the bottom; scan back to front.
  const links = [...body.links].reverse();
  for (const link of links) {
    if (UNSUBSCRIBE_LINK_TEXT.some((pattern) => pattern.test(link.text))) {
      return { method: "footer", target: link.href };
    }
  }
  for (const link of links) {
    if (UNSUBSCRIBE_URL.some((pattern) => pattern.test(link.href))) {
      return { method: "footer", target: link.href };
    }
  }
  return undefined;
}
