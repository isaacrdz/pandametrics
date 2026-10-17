import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanTier } from "@/lib/plans/plan";
import type { SurveyFormValues } from "@/lib/surveys/schema";

// createSurvey against a fake transaction: the guarded counter UPDATE itself is SQL and checked end
// to end, here the decision around it (publish when a slot is free, draft otherwise)

const plans = vi.hoisted(() => ({ tier: "PRO" as PlanTier }));
vi.mock("@/server/plans", () => ({ organizationTier: vi.fn(async () => plans.tier) }));

interface FakeData {
  members?: number;
  // Rows the guarded UPDATE matches: 1 when a slot is free, 0 at the limit
  claimed?: number;
}

const db = vi.hoisted(() => ({ tx: null as unknown }));
vi.mock("@/server/prisma", () => ({
  prisma: { $transaction: vi.fn(async (run: (tx: unknown) => unknown) => run(db.tx)) },
}));

const { createSurvey, SurveyServiceError } = await import("@/lib/surveys/service");

const SCOPE = { organizationId: "org-1", userId: "user-1" };

function fakeTx({ members = 1, claimed = 1 }: FakeData) {
  let created: Record<string, unknown> = {};
  return {
    membership: { count: vi.fn(async () => members) },
    organization: { updateMany: vi.fn(async () => ({ count: claimed })) },
    survey: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created = data;
        return data;
      }),
      findUniqueOrThrow: vi.fn(async () => ({
        ...created,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [],
      })),
    },
    $executeRaw: vi.fn(async () => 0),
  };
}

function input(isActive: boolean): SurveyFormValues {
  return { name: "Store survey", description: "", isActive, category: "RATING", questions: [] };
}

describe("createSurvey", () => {
  beforeEach(() => {
    plans.tier = "PRO";
  });

  it("publishes the survey when the organization has a free slot", async () => {
    const tx = fakeTx({ claimed: 1 });
    db.tx = tx;
    const survey = await createSurvey(SCOPE, input(false));
    expect(survey.isActive).toBe(true);
    expect(tx.survey.create).toHaveBeenCalledWith({ data: expect.objectContaining({ isActive: true }) });
  });

  it("creates a draft at the limit instead of failing", async () => {
    const tx = fakeTx({ claimed: 0 });
    db.tx = tx;
    const survey = await createSurvey(SCOPE, input(true));
    expect(survey.isActive).toBe(false);
    expect(tx.survey.create).toHaveBeenCalledWith({ data: expect.objectContaining({ isActive: false }) });
  });

  it.each([
    ["PRO", 4],
    ["FREE", 0],
  ] as const)("claims one slot within the %s limit", async (tier, below) => {
    plans.tier = tier;
    const tx = fakeTx({});
    db.tx = tx;
    await createSurvey(SCOPE, input(false));
    expect(tx.organization.updateMany).toHaveBeenCalledWith({
      where: { id: "org-1", activeSurveyCount: { lte: below } },
      data: { activeSurveyCount: { increment: 1 } },
    });
  });

  it("refuses a user who is no longer an active member, without touching the counter", async () => {
    const tx = fakeTx({ members: 0 });
    db.tx = tx;
    await expect(createSurvey(SCOPE, input(false))).rejects.toEqual(new SurveyServiceError("NO_ORGANIZATION"));
    expect(tx.organization.updateMany).not.toHaveBeenCalled();
    expect(tx.survey.create).not.toHaveBeenCalled();
  });
});
