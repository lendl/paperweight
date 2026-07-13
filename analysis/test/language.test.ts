import { describe, expect, it } from "vitest";
import { detectLanguage } from "../src/extract/language";

describe("detectLanguage", () => {
  it("detects English", () => {
    expect(
      detectLanguage("Thank you for your order. We will send you a confirmation as soon as your package ships."),
    ).toBe("eng");
  });

  it("detects Dutch", () => {
    expect(
      detectLanguage("Bedankt voor je bestelling. We hebben je pakket vandaag verzonden en je ontvangt morgen een bevestiging."),
    ).toBe("nld");
  });

  it("detects German", () => {
    expect(
      detectLanguage("Vielen Dank für Ihre Bestellung. Wir haben Ihr Paket heute versendet und Sie erhalten morgen eine Bestätigung."),
    ).toBe("deu");
  });

  it("returns und for empty input", () => {
    expect(detectLanguage("")).toBe("und");
    expect(detectLanguage("   \n ")).toBe("und");
  });

  it("returns und for text too short to judge", () => {
    expect(detectLanguage("ok thanks")).toBe("und");
  });

  it("returns und for non-language content", () => {
    expect(detectLanguage("3849 1123 9982 4471 0092 8811 3345")).toBe("und");
  });

  it("is not fooled by urls and addresses around short prose", () => {
    expect(
      detectLanguage(
        "Bekijk je bestelling op https://www.example-webshop.example/orders/12345?utm_source=mail " +
          "of mail ons via klantenservice@example-webshop.example voor al je vragen hierover.",
      ),
    ).toBe("nld");
  });

  it("detects English loanword-heavy Dutch as Dutch", () => {
    expect(
      detectLanguage(
        "Download de app en check de status van je account. Je kunt je e-mail voorkeuren " +
          "altijd aanpassen via de instellingen op je dashboard.",
      ),
    ).toBe("nld");
  });
});
