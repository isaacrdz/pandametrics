import { describe, expect, it, vi } from "vitest";
import type { SurveyFormInput } from "@/lib/surveys/schema";

const actions = vi.hoisted(() => ({ createSurvey: vi.fn(), updateSurvey: vi.fn() }));
vi.mock("@/actions/surveys", () => actions);

const { FORM_MODES } = await import("@/components/surveys/form/form-modes");

const VALUES: SurveyFormInput = { name: "Store survey", description: "", isActive: false, category: "RATING", questions: [] };

function helpers() {
  return { navigate: vi.fn(), reset: vi.fn(), notify: vi.fn() };
}

describe("FORM_MODES.create.save", () => {
  it.each([
    [true, "created"],
    [false, "createdAsDraft"],
  ] as const)("isActive %s → %s toast, then the edit page", async (isActive, toast) => {
    actions.createSurvey.mockResolvedValueOnce({ success: true, data: { id: "s-1", isActive } });
    const h = helpers();
    expect(await FORM_MODES.create.save(VALUES, undefined, h)).toBeNull();
    expect(h.notify).toHaveBeenCalledWith(toast);
    expect(h.navigate).toHaveBeenCalledWith("/surveys/s-1");
  });

  it("returns the error and stays on the form", async () => {
    actions.createSurvey.mockResolvedValueOnce({ success: false, error: { code: "NO_ORGANIZATION" } });
    const h = helpers();
    expect(await FORM_MODES.create.save(VALUES, undefined, h)).toEqual({ code: "NO_ORGANIZATION" });
    expect(h.notify).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });
});
