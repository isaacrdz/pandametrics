import * as z from "zod";

// The create-organization form (/welcome), shared by the client and the action. Error messages are
// keys under "validation" in src/messages.

export const ORGANIZATION_NAME_MAX = 80;

export const organizationSchema = z.object({
  name: z.string().trim().min(1, { error: "required" }).max(ORGANIZATION_NAME_MAX, { error: "tooLong" }),
});

export type OrganizationInput = z.input<typeof organizationSchema>;
export type OrganizationValues = z.output<typeof organizationSchema>;
