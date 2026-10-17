import { describe, expect, it } from "vitest";
import { highlightMatch, matchScore, normalize } from "@/lib/search/match";

describe("normalize", () => {
  it("removes accents, lowercases and collapses spaces", () => {
    expect(normalize("  Configuración   del  Plan ")).toBe("configuracion del plan");
    expect(normalize("ÑANDÚ")).toBe("nandu");
  });
});

describe("matchScore", () => {
  it("ignores accents and case", () => {
    expect(matchScore("Configuración", "configuracion")).toBeGreaterThan(0);
    expect(matchScore("Mi perfil", "MI PERFIL")).toBeGreaterThan(0);
  });

  it("ranks the start of the label over the start of a word over anywhere", () => {
    const start = matchScore("Surveys", "sur");
    const wordStart = matchScore("All surveys", "sur");
    const anywhere = matchScore("Resurvey", "sur");
    expect(start).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(anywhere);
    expect(anywhere).toBeGreaterThan(0);
  });

  it("needs every word to match, in any order", () => {
    expect(matchScore("Switch to Panda Labs", "panda switch")).toBeGreaterThan(0);
    expect(matchScore("Switch to Panda Labs", "panda acme")).toBe(0);
  });

  it("matches keywords in either language at the start of a word", () => {
    expect(matchScore("Plan", "billing", ["settings", "configuración", "billing"])).toBeGreaterThan(0);
    expect(matchScore("Dark mode", "tema", ["theme", "tema oscuro"])).toBeGreaterThan(0);
    expect(matchScore("Dark mode", "ema", ["theme", "tema"])).toBe(0);
  });

  it("prefers a label match over a keyword match", () => {
    expect(matchScore("Settings", "set")).toBeGreaterThan(matchScore("Plan", "set", ["settings"]));
  });

  it("returns 0 when nothing matches and matches everything for a blank query", () => {
    expect(matchScore("Dashboard", "xyz")).toBe(0);
    expect(matchScore("Dashboard", "   ")).toBe(1);
  });
});

describe("highlightMatch", () => {
  it("splits around the first match", () => {
    expect(highlightMatch("Customer satisfaction", "satis")).toEqual({
      before: "Customer ",
      match: "satis",
      after: "faction",
    });
  });

  it("matches without accents but keeps the original characters", () => {
    expect(highlightMatch("Encuesta de satisfacción", "satisfaccion")).toEqual({
      before: "Encuesta de ",
      match: "satisfacción",
      after: "",
    });
  });

  it("handles decomposed accents and emoji around the match", () => {
    const decomposed = "Café rápido";
    expect(highlightMatch(decomposed, "cafe")?.match).toBe("Café");
    expect(highlightMatch("🐼 Panda feedback", "panda")).toEqual({ before: "🐼 ", match: "Panda", after: " feedback" });
  });

  it("returns null without a match or a query", () => {
    expect(highlightMatch("Store feedback", "zzz")).toBeNull();
    expect(highlightMatch("Store feedback", " ")).toBeNull();
  });
});
