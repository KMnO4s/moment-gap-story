import { describe, expect, it } from "vitest";
import { averageInterval, formatDuration, parseNote } from "./occurrences";

describe("occurrences", () => {
  it("moyenne = (dernière - première) / (n - 1)", () => {
    expect(averageInterval(["2026-01-01T00:00:00Z", "2026-01-03T00:00:00Z", "2026-01-11T00:00:00Z"])).toBe(5 * 86400000);
  });
  it("pas de moyenne avec une seule occurrence", () => {
    expect(averageInterval(["2026-01-01T00:00:00Z"])).toBeNull();
  });
  it("formate jours heures minutes", () => {
    expect(formatDuration(((2 * 24 + 3) * 60 + 5) * 60000)).toBe("2 j 3 h 5 min");
  });
  it("conserve le texte non JSON", () => {
    expect(parseNote("bonjour").legacyText).toBe("bonjour");
  });
});
