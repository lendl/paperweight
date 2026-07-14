import { describe, expect, it } from "vitest";
import { textTypeSignals } from "../src/classify/text-signals";

function ids(text: string): string[] {
  return textTypeSignals(text).map((s) => s.id);
}

describe("textTypeSignals", () => {
  it("returns nothing for empty text", () => {
    expect(textTypeSignals("")).toEqual([]);
  });

  it("finds reference codes after order/booking prefixes", () => {
    for (const text of [
      "Ordernummer: 845123B7X2C",
      "Booking N°: 1009876543",
      "booking reference: KLMNPQR",
      "Order ID: IBE-1009-0080021-1",
      "Order Number 309258960",
      "ordernummer 704812905W7201455",
    ]) {
      const signals = textTypeSignals(text);
      expect(signals.some((s) => s.id === "text.reference-code"), text).toBe(true);
    }
  });

  it("does not read prose after 'order number' as a code", () => {
    expect(ids("your order number is wrong, please check")).not.toContain("text.reference-code");
  });

  it("does not fire order vocabulary on 'in order to'", () => {
    expect(ids("In order to deliver more value we changed our plans.")).not.toContain(
      "text.purchase-vocab",
    );
  });

  it("finds distinct order vocabulary with the matched term as detail", () => {
    const signals = textTypeSignals("Je bestelling is verzonden. Het pakket komt morgen aan. Je bestelling is onderweg.");
    const orderSignals = signals.filter((s) => s.id === "text.purchase-vocab");
    expect(orderSignals.map((s) => s.detail)).toEqual(["bestelling", "verzonden", "pakket"]);
  });

  it("finds amounts in euro and dollar formats", () => {
    expect(ids("Total price € 189,60 incl. VAT")).toContain("text.amount");
    expect(ids("Final Cost $17.86")).toContain("text.amount");
    expect(ids("Gratis verzending vanaf €100,-")).toContain("text.amount");
    expect(ids("No numbers here")).not.toContain("text.amount");
  });

  it("treats booking/appointment confirmations as order-confirmation evidence", () => {
    for (const text of [
      "Uw afspraak staat! We zien je vrijdag.",
      "In de bijlage vindt u uw reserveringsbevestiging.",
      "Your booking confirmation is attached.",
      "Bedankt voor je bestelling.",
    ]) {
      expect(ids(text), text).toContain("text.purchase-confirmation");
    }
  });

  it("keeps reminders and appointment talk transactional, not order", () => {
    const signals = textTypeSignals("Graag herinneren wij je aan jouw afspraak van morgen.");
    expect(signals.some((s) => s.id === "text.update-vocab")).toBe(true);
    expect(signals.some((s) => s.id === "text.purchase-confirmation")).toBe(false);
  });

  it("finds lab/portal notifications as transactional", () => {
    expect(ids("U heeft labuitslagen ontvangen in uw patiëntenportaal")).toContain(
      "text.update-vocab",
    );
  });
});
