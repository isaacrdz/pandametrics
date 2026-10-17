import { describe, expect, it } from "vitest";
import { composePhone, formatNational, formatPhone, parsePhone, readPhoneInput, splitPhone } from "@/lib/phone";

describe("formatNational", () => {
  it("groups Mexican numbers by their area code", () => {
    expect(formatNational("MX", "5512345678")).toBe("55 1234 5678");
    expect(formatNational("MX", "8112345678")).toBe("81 1234 5678");
    expect(formatNational("MX", "2221234567")).toBe("222 123 4567");
  });

  it("formats US numbers with the area code in parentheses", () => {
    expect(formatNational("US", "4155550134")).toBe("(415) 555-0134");
  });

  it("formats a number while it is typed", () => {
    expect(formatNational("MX", "55")).toBe("55");
    expect(formatNational("MX", "551")).toBe("55 1");
    expect(formatNational("MX", "551234")).toBe("55 1234");
    expect(formatNational("US", "415")).toBe("415");
    expect(formatNational("US", "4155")).toBe("(415) 5");
    expect(formatNational("US", "4155550")).toBe("(415) 555-0");
  });

  it("never shows more than 10 digits", () => {
    expect(formatNational("US", "415555013499")).toBe("(415) 555-0134");
  });
});

describe("readPhoneInput", () => {
  it("drops the country code of a pasted national number", () => {
    expect(readPhoneInput("MX", "52 55 1234 5678")).toEqual({ country: "MX", national: "5512345678" });
    expect(readPhoneInput("MX", "521 55 1234 5678")).toEqual({ country: "MX", national: "5512345678" });
    expect(readPhoneInput("US", "1 415 555 0134")).toEqual({ country: "US", national: "4155550134" });
  });

  it("switches country for a full international number", () => {
    expect(readPhoneInput("MX", "+1 (415) 555-0134")).toEqual({ country: "US", national: "4155550134" });
    expect(readPhoneInput("US", "+52 1 55 1234 5678")).toEqual({ country: "MX", national: "5512345678" });
    expect(readPhoneInput("MX", "+44 20 7946 0958")).toEqual({ country: "OTHER", national: "+44 20 7946 0958" });
    expect(readPhoneInput("MX", "+")).toEqual({ country: "OTHER", national: "+" });
  });

  it("keeps spaces while another country's number is typed", () => {
    expect(readPhoneInput("OTHER", "+44 ")).toEqual({ country: "OTHER", national: "+44 " });
    expect(readPhoneInput("OTHER", "+44 20")).toEqual({ country: "OTHER", national: "+44 20" });
  });

  it("drops national prefixes typed one key at a time", () => {
    // After "+52" switched the picker, the old mobile "1" comes next
    expect(readPhoneInput("MX", "1")).toEqual({ country: "MX", national: "" });
    expect(readPhoneInput("MX", "1331234")).toEqual({ country: "MX", national: "331234" });
    expect(readPhoneInput("MX", "015512345678")).toEqual({ country: "MX", national: "5512345678" });
    expect(readPhoneInput("US", "1415")).toEqual({ country: "US", national: "415" });
  });
});

describe("composePhone and splitPhone", () => {
  it("round-trips the field value", () => {
    expect(composePhone("MX", "5512345678")).toBe("+52 55 1234 5678");
    expect(composePhone("US", "4155550134")).toBe("+1 (415) 555-0134");
    expect(splitPhone("+52 55 1234 5678")).toEqual({ country: "MX", national: "5512345678" });
    expect(splitPhone("+14155550134")).toEqual({ country: "US", national: "4155550134" });
  });

  it("keeps the field empty without digits", () => {
    expect(composePhone("MX", "")).toBe("");
    expect(splitPhone("")).toEqual({ country: "MX", national: "" });
    expect(splitPhone("", "US")).toEqual({ country: "US", national: "" });
  });

  it("keeps another country's number as typed", () => {
    expect(splitPhone("+44 ")).toEqual({ country: "OTHER", national: "+44 " });
  });

  it("reads an old bare 10-digit number as Mexican", () => {
    expect(splitPhone("5512345678")).toEqual({ country: "MX", national: "5512345678" });
  });
});

describe("parsePhone", () => {
  it("stores Mexican and US numbers as E.164", () => {
    expect(parsePhone("+52 55 1234 5678")).toEqual({ ok: true, phone: "+525512345678" });
    expect(parsePhone("+52 1 55 1234 5678")).toEqual({ ok: true, phone: "+525512345678" });
    expect(parsePhone("+1 (415) 555-0134")).toEqual({ ok: true, phone: "+14155550134" });
    expect(parsePhone("5512345678")).toEqual({ ok: true, phone: "+525512345678" });
  });

  it("needs all 10 digits", () => {
    expect(parsePhone("+52 55 1234")).toEqual({ ok: false, error: "invalidPhoneMx" });
    expect(parsePhone("+1 (415) 555")).toEqual({ ok: false, error: "invalidPhoneUs" });
  });

  it("rejects US area codes or exchanges starting with 0 or 1", () => {
    expect(parsePhone("+1 (015) 555-0134")).toEqual({ ok: false, error: "invalidPhoneUs" });
    expect(parsePhone("+1 (415) 155-0134")).toEqual({ ok: false, error: "invalidPhoneUs" });
  });

  it("accepts other countries with their code, 7 to 15 digits", () => {
    expect(parsePhone("+44 20 7946 0958")).toEqual({ ok: true, phone: "+442079460958" });
    expect(parsePhone("+44 12")).toEqual({ ok: false, error: "invalidPhone" });
    expect(parsePhone("+")).toEqual({ ok: false, error: "invalidPhone" });
  });
});

describe("formatPhone", () => {
  it("formats stored Mexican and US numbers and leaves the rest as stored", () => {
    expect(formatPhone("+525598765432")).toBe("+52 55 9876 5432");
    expect(formatPhone("+523312344321")).toBe("+52 33 1234 4321");
    expect(formatPhone("+14155550134")).toBe("+1 (415) 555-0134");
    expect(formatPhone("+442079460958")).toBe("+442079460958");
  });
});
