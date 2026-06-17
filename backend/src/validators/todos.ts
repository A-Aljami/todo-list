import { z } from "zod/v4";

export const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(2).optional(),
  due_date: z.string().optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  is_done: z.boolean().optional(),
  priority: z.number().int().min(0).max(2).optional(),
  due_date: z.string().optional(),
});
