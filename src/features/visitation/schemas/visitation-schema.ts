import { z } from "zod";

export const createVisitationSchema = z.object({
  serviceWeekId: z.string().uuid(),
  recordId: z.string().uuid().optional(),
  expectedVersion: z.number().int().positive().optional(),
  memberId: z.string().uuid(),
  visitationTypeId: z.string().uuid(),
  visitedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2000).default(""),
}).refine((value) => Boolean(value.recordId) === Boolean(value.expectedVersion), {
  message: "Record ID and expected version must be supplied together",
});
