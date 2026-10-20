import { z } from "zod";
import { CategoryType } from "@prisma/client";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(100, "Nama terlalu panjang"),
  type: z.nativeEnum(CategoryType),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().uuid("ID kategori tidak valid"),
});

export const getCategoriesQuerySchema = z.object({
  type: z
    .enum(["INCOME", "EXPENSE", "REFUND"])
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : v as CategoryType | undefined)),
  search: z.string().optional().nullable(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type GetCategoriesQuery = z.infer<typeof getCategoriesQuerySchema>;
