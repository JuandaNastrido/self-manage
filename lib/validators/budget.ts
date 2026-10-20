import { z } from "zod";

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid("ID kategori tidak valid"),
  year: z
    .number()
    .int("Tahun harus bilangan bulat")
    .min(1900, "Tahun tidak valid")
    .max(2100, "Tahun tidak valid"),
  month: z
    .number()
    .int("Bulan harus bilangan bulat")
    .min(1, "Bulan tidak valid")
    .max(12, "Bulan tidak valid"),
  amount: z
    .number({ message: "Jumlah harus berupa angka" })
    .int("Jumlah harus bilangan bulat")
    .nonnegative("Jumlah tidak boleh negatif"),
});

export const updateBudgetSchema = createBudgetSchema.partial().extend({
  id: z.string().uuid("ID budget tidak valid"),
});

export const getBudgetsQuerySchema = z.object({
  year: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : parseInt(v, 10))),
  month: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : parseInt(v, 10))),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type GetBudgetsQuery = z.infer<typeof getBudgetsQuerySchema>;
