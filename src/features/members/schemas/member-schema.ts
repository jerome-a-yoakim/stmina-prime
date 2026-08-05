import { z } from "zod";

const optionalPhone = z.string().trim().max(30).nullable().optional();
export const memberSchema = z.object({
  groupId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  givenName: z.string().trim().min(1).max(80).nullable().optional(),
  fatherName: z.string().trim().min(1).max(80).nullable().optional(),
  phone: optionalPhone,
  familyPhone: optionalPhone,
  additionalFamilyPhone: optionalPhone,
  address: z.string().trim().max(300).nullable().optional(),
  school: z.string().trim().max(120).nullable().optional(),
  birthDate: z.string().date().refine((value) => value <= new Date().toISOString().slice(0, 10), "Birth date cannot be in the future").nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  brotherOfLord: z.boolean().optional(),
});
