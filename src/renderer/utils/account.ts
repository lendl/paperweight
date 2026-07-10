import type { AccountInfo } from "@shared/types";

/**
 * Whether the connected account can send mail from within the app. OAuth
 * providers always can; an IMAP account can only send once an SMTP server is
 * configured. When false, the UI should route the user to (re)connect SMTP
 * rather than letting a send fail at the point of no return.
 */
export function canAccountSend(
  info: Pick<AccountInfo, "providerType" | "server">,
): boolean {
  if (info.providerType === "imap") return !!info.server?.smtp;
  return info.providerType === "gmail" || info.providerType === "microsoft";
}
