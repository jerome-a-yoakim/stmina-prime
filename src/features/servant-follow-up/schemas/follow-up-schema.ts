import { z } from "zod";

export const servantFollowUpRecordSchema = z.object({
  userId: z.string().uuid(),
  followUpDate: z.string().date(),
  fridayServiceAttendance: z.boolean(),
  liturgyAttendance: z.boolean(),
  lessonPreparation: z.boolean(),
});

export const servantFollowUpDaySchema = z.object({
  followUpDate: z.string().date(),
  records: z.array(servantFollowUpRecordSchema.omit({ followUpDate: true })).min(1),
});

export type ServantFollowUpRecordInput = z.infer<typeof servantFollowUpRecordSchema>;
