import { z } from "zod";

const dateString = () =>
  z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .transform((val) => new Date(val));

export const createSavingsGoalSchema = z.object({
  name: z
    .string({ message: "Nama tujuan tabungan wajib diisi" })
    .min(1, "Nama tujuan tabungan wajib diisi")
    .max(200, "Nama terlalu panjang"),
  description: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
  targetAmount: z
    .number({ message: "Jumlah target harus berupa angka" })
    .int("Jumlah target harus bilangan bulat")
    .positive("Jumlah target harus positif"),
  targetDate: dateString().optional().nullable(),
});

export const updateSavingsGoalSchema = createSavingsGoalSchema.partial().extend({
  id: z.string().uuid("ID tujuan tabungan tidak valid"),
});

export const createSavingsAllocationSchema = z.object({
  savingsGoalId: z.string().uuid("ID tujuan tabungan tidak valid"),
  transactionId: z
    .string()
    .uuid("ID transaksi tidak valid")
    .optional()
    .nullable(),
  amount: z
    .number({ message: "Jumlah harus berupa angka" })
    .int("Jumlah harus bilangan bulat")
    .positive("Jumlah harus positif"),
  date: dateString(),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;
export type CreateSavingsAllocationInput = z.infer<
  typeof createSavingsAllocationSchema
>;
