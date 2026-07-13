// The only file that knows about MIME. Everything past parseEml works on RawMessage.
import PostalMime, { type Address, type Email } from "postal-mime";
import type { RawMessage } from "../types";

export async function parseEml(raw: string | Uint8Array): Promise<RawMessage> {
  const email = await PostalMime.parse(raw);
  const message: RawMessage = { headers: collectHeaders(email) };
  if (email.text !== undefined) message.text = email.text;
  if (email.html !== undefined) message.html = email.html;
  return message;
}

function collectHeaders(email: Email): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = {};
  // email.headers is in original top-down message order; repeated headers
  // like Received become arrays in that same order.
  for (const { key, value } of email.headers) {
    const existing = headers[key];
    if (existing === undefined) headers[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else headers[key] = [existing, value];
  }

  // Raw header values are not RFC 2047-decoded; overwrite the addressing
  // headers with postal-mime's decoded forms so consumers never see =?utf-8?…?=.
  if (email.subject !== undefined) headers["subject"] = email.subject;
  if (email.from) headers["from"] = formatAddressList([email.from]);
  if (email.replyTo?.length) headers["reply-to"] = formatAddressList(email.replyTo);
  if (email.to?.length) headers["to"] = formatAddressList(email.to);
  if (email.cc?.length) headers["cc"] = formatAddressList(email.cc);
  return headers;
}

function formatAddressList(addresses: Address[]): string {
  return addresses.map(formatAddress).join(", ");
}

function formatAddress(address: Address): string {
  if (address.group) {
    return `${address.name}: ${formatAddressList(address.group)};`;
  }
  if (!address.name) return address.address;
  return `${address.name} <${address.address}>`;
}
