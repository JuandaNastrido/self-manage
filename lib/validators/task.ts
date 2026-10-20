import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z
    .string({ message: "Judul tugas wajib diisi" })
    .min(1, "Judul tugas wajib diisi")
    .max(200, "Judul terlalu panjang"),
  description: z.string().max(2000, "Deskripsi terlalu panjang").optional().nullable(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Tanggal deadline tidak valid",
    })
    .transform((val) => new Date(val))
    .optional()
    .nullable(),
  plannedDurationMinutes: z
    .number()
    .int("Durasi harus bilangan bulat")
    .nonnegative("Durasi tidak boleh negatif")
    .optional()
    .nullable(),
  taskCategoryId: z
    .string()
    .uuid("ID kategori tugas tidak valid")
    .optional()
    .nullable(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid("ID tugas tidak valid"),
});

export const getTasksQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      if (Object.values(TaskStatus).includes(v as TaskStatus)) {
        return v as TaskStatus;
      }
      return undefined;
    }),
  priority: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      if (Object.values(TaskPriority).includes(v as TaskPriority)) {
        return v as TaskPriority;
      }
      return undefined;
    }),
  overdue: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v === "true"),
  search: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;
