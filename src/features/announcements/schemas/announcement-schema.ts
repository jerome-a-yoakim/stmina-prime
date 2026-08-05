import { z } from "zod";

const fields = {
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(2).max(10000),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["draft", "published", "archived"]),
};

export const announcementSchema = z.object(fields).refine((value) => value.startDate <= value.endDate, {
  message: "تاريخ البداية يجب أن يسبق أو يساوي تاريخ النهاية.", path: ["endDate"],
});

export const updateAnnouncementSchema = z.object(fields).refine((value) => value.startDate <= value.endDate, {
  message: "تاريخ البداية يجب أن يسبق أو يساوي تاريخ النهاية.", path: ["endDate"],
});

