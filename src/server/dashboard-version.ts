import "server-only";

import { prisma } from "@/server/prisma";

// A cheap fingerprint of what the dashboard shows: the newest answer and the newest survey change
// (create, edit, activate, move to draft, delete all bump Survey.updatedAt). Both read an index on
// (organizationId, createdAt / updatedAt DESC). Never cached: the open dashboard compares it to
// decide whether to refresh
export async function getDashboardVersion(organizationId: string): Promise<string> {
  const [response, survey] = await Promise.all([
    prisma.surveyResponse.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.survey.findFirst({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);
  return `${response?.createdAt.getTime() ?? 0}:${survey?.updatedAt.getTime() ?? 0}`;
}
