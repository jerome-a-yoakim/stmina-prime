import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  roleIds: z.array(z.string().uuid()).min(1),
  classIds: z.array(z.string().uuid()).default([]),
  responsibilityIds: z.array(z.string().uuid()).default([]),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  alternatePhone: z.string().trim().max(30).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  status: z.enum(["active", "suspended", "archived"]).optional(),
  roleId: z.string().uuid().optional(),
  classIds: z.array(z.string().uuid()).optional(),
  responsibilityIds: z.array(z.string().uuid()).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
