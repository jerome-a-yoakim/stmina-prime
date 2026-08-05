import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const serviceSettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(100),
  meetingWeekday: z.number().int().min(1).max(7),
  meetingTime: time,
  attendanceDeadline: time,
  allowVisitationAfterMeeting: z.boolean(),
  automaticWeekRollover: z.boolean(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((value) => value.attendanceDeadline >= value.meetingTime, {
  message: "Attendance deadline must not be before meeting time",
  path: ["attendanceDeadline"],
});

