import { describe, expect, it } from "vitest";
import { newSurveyHref, personHref, seeAllHref, surveyHref } from "@/lib/search/destinations";

const person = { id: "u-2", email: "lucia@acme.co", isCurrentUser: false, isOwner: false };

describe("personHref", () => {
  it("sends you to your profile", () => {
    expect(personHref({ ...person, isCurrentUser: true }, true)).toBe("/profile");
    expect(personHref({ ...person, isCurrentUser: true }, false)).toBe("/profile");
  });

  it("opens the edit page for owners and admins", () => {
    expect(personHref(person, true)).toBe("/users/u-2");
  });

  it("never opens the owner's edit page for someone else", () => {
    expect(personHref({ ...person, isOwner: true }, true)).toBe("/users?q=lucia%40acme.co");
  });

  it("filters the read-only list for members", () => {
    expect(personHref(person, false)).toBe("/users?q=lucia%40acme.co");
  });
});

describe("other destinations", () => {
  it("opens a survey's edit page", () => {
    expect(surveyHref("s-1")).toBe("/surveys/s-1");
  });

  it("hands the query to the full lists, encoded", () => {
    expect(seeAllHref("surveys", " café & más ")).toBe("/surveys?q=caf%C3%A9+%26+m%C3%A1s");
    expect(seeAllHref("people", "lucia")).toBe("/users?q=lucia");
    expect(seeAllHref("people", "  ")).toBe("/users");
  });

  it("prefills the new survey's name", () => {
    expect(newSurveyHref("Store #7 feedback")).toBe("/surveys/new?name=Store+%237+feedback");
    expect(newSurveyHref(" ")).toBe("/surveys/new");
  });
});
