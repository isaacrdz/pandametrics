import { describe, expect, it } from "vitest";
import { getInitials } from "@/lib/format";

describe("getInitials", () => {
  it("takes the first letters of the first two words of the name", () => {
    expect(getInitials("Jordan Lee")).toBe("JL");
    expect(getInitials("Ana María López")).toBe("AM");
    expect(getInitials("Nora")).toBe("N");
  });

  it("ignores extra whitespace and uppercases", () => {
    expect(getInitials("  jordan   lee ")).toBe("JL");
    expect(getInitials("ana\tlópez")).toBe("AL");
  });

  it("keeps accented letters whole, composed or decomposed", () => {
    expect(getInitials("Ángel Ñúñez")).toBe("ÁÑ");
    expect(getInitials("Ángel")).toBe("Á");
    expect(getInitials("élodie")).toBe("É");
  });

  it("takes a whole emoji, never half a surrogate pair", () => {
    expect(getInitials("🐼 Panda")).toBe("🐼P");
    expect(getInitials("👍🏽 Team")).toBe("👍🏽T");
    expect(getInitials("𝒜lice")).toBe("𝒜");
  });

  it("skips punctuation around words", () => {
    expect(getInitials("(Ana) López")).toBe("AL");
    expect(getInitials("Ana - López")).toBe("AL");
    expect(getInitials("'Ola Smith'")).toBe("OS");
  });

  it("falls back to the email's local part without a name", () => {
    expect(getInitials(null, "ana.lopez@acme.co")).toBe("AL");
    expect(getInitials("", "nora@acme.co")).toBe("N");
    expect(getInitials("   ", "mary_jane-watson@acme.co")).toBe("MJ");
    expect(getInitials(null, "ana+news@acme.co")).toBe("A");
    expect(getInitials(null, "jdoe42@acme.co")).toBe("J");
  });

  it("prefers the name over the email", () => {
    expect(getInitials("Jordan Lee", "ana.lopez@acme.co")).toBe("JL");
  });

  it("uses the email when the name has no letters", () => {
    expect(getInitials("---", "nora@acme.co")).toBe("N");
  });

  it("returns ? when neither has a letter", () => {
    expect(getInitials(null)).toBe("?");
    expect(getInitials(null, null)).toBe("?");
    expect(getInitials("", "")).toBe("?");
    expect(getInitials("...", ".@acme.co")).toBe("?");
  });
});
