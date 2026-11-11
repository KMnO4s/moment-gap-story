import { describe, expect, it } from "vitest";
import { addOccurrence, averageInterval, editOccurrence, formatDuration, parseNote, removeOccurrence, serializeNote } from "./occurrences";

const A = "2026-01-01T08:00:00.000Z", B = "2026-01-05T08:00:00.000Z", C = "2026-01-09T07:50:00.000Z";

describe("occurrences", () => {
  it("moyenne = (dernière - première) / (n - 1)", () => {
    expect(averageInterval(["2026-01-01T00:00:00Z", "2026-01-03T00:00:00Z", "2026-01-11T00:00:00Z"])).toBe(5 * 86400000);
  });
  it("pas de moyenne avec une seule occurrence", () => expect(averageInterval([A])).toBeNull());
  it("formate jours heures minutes", () => expect(formatDuration(((2 * 24 + 3) * 60 + 5) * 60000)).toBe("2 j 3 h 5 min"));
  it("conserve le texte non JSON", () => expect(parseNote("bonjour").legacyText).toBe("bonjour"));
  it("ajout manuel inséré à sa place", () => expect(addOccurrence([A, C], B)).toEqual([A, B, C]));
  it("modification réordonne", () => expect(editOccurrence([A, B], A, C)).toEqual([B, C]));
  it("suppression retire seulement la bonne", () => expect(removeOccurrence([A, B, C], B)).toEqual([A, C]));
});

describe("format texte", () => {
  it("aller-retour avec description multiligne", () => {
    const d = { version: 1 as const, description: "Lame\nGillette", occurrences: [A, C] };
    expect(parseNote(serializeNote(d))).toEqual(d);
  });
  it("ancien titre devient description", () => {
    expect(parseNote(`# Lame\n\n- ${A} · x\n`)).toEqual({ version: 1, description: "Lame", occurrences: [A] });
  });
  it("lit l'ancien format JSON", () => {
    expect(parseNote(`{"title":"X","occurrences":["${A}"]}`).occurrences).toEqual([A]);
  });
});
