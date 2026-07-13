import { describe, expect, it } from "vitest";
import { parseEml } from "../src/parse/eml";

function eml(lines: string[]): string {
  return lines.join("\r\n") + "\r\n";
}

describe("parseEml", () => {
  it("parses a simple text/plain message", async () => {
    const msg = await parseEml(
      eml([
        "From: Alice Example <alice@example.com>",
        "To: Bob Example <bob@example.com>",
        "Subject: Hello",
        "Date: Mon, 6 Jul 2026 10:00:00 +0200",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Hello Bob,",
        "",
        "See you tomorrow.",
      ]),
    );

    expect(msg.headers["subject"]).toBe("Hello");
    expect(msg.headers["from"]).toBe("Alice Example <alice@example.com>");
    expect(msg.text).toContain("Hello Bob,");
    expect(msg.text).toContain("See you tomorrow.");
    expect(msg.html).toBeUndefined();
  });

  it("keeps both parts of multipart/alternative", async () => {
    const msg = await parseEml(
      eml([
        "From: shop@example.com",
        "Subject: Order",
        'Content-Type: multipart/alternative; boundary="B"',
        "",
        "--B",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Plain body",
        "--B",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<p>Html body</p>",
        "--B--",
      ]),
    );

    expect(msg.text).toContain("Plain body");
    expect(msg.html).toContain("<p>Html body</p>");
  });

  it("decodes quoted-printable bodies", async () => {
    const msg = await parseEml(
      eml([
        "From: a@example.com",
        "Subject: qp",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        "H=C3=A9llo caf=C3=A9",
      ]),
    );

    expect(msg.text).toContain("Héllo café");
  });

  it("decodes RFC 2047 encoded subject and display name", async () => {
    const msg = await parseEml(
      eml([
        "From: =?utf-8?Q?Caf=C3=A9_Zeeland?= <info@cafe.example>",
        "Subject: =?utf-8?B?QmV2ZXN0aWdpbmcgcsOpc2VydmVyaW5n?=",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Body",
      ]),
    );

    expect(msg.headers["subject"]).toBe("Bevestiging réservering");
    expect(msg.headers["from"]).toBe("Café Zeeland <info@cafe.example>");
  });

  it("collects repeated headers into an array in original order", async () => {
    const msg = await parseEml(
      eml([
        "Received: from a.example by b.example; Mon, 6 Jul 2026 10:00:00 +0200",
        "Received: from b.example by c.example; Mon, 6 Jul 2026 10:00:01 +0200",
        "From: a@example.com",
        "Subject: r",
        "",
        "Body",
      ]),
    );

    const received = msg.headers["received"];
    expect(Array.isArray(received)).toBe(true);
    expect(received).toHaveLength(2);
    expect((received as string[])[0]).toContain("from a.example");
  });

  it("returns html-only messages without a text part", async () => {
    const msg = await parseEml(
      eml([
        "From: a@example.com",
        "Subject: h",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<p>Only html</p>",
      ]),
    );

    expect(msg.html).toContain("Only html");
    expect(msg.text).toBeUndefined();
  });

  it("accepts Uint8Array input", async () => {
    const raw = new TextEncoder().encode(
      eml(["From: a@example.com", "Subject: bytes", "", "Body"]),
    );
    const msg = await parseEml(raw);
    expect(msg.headers["subject"]).toBe("bytes");
  });
});
