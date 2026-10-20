import { z } from "zod";
import { TransactionType } from "@prisma/client";

const dateString = () =>
  z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .transform((val) => new Date(val));

export const createTransactionSchema = z.object({
  amount: z
    .number({ message: "Jumlah harus berupa angka" })
    .int("Jumlah harus bilangan bulat")
    .nonnegative("Jumlah tidak boleh negatif"),
  type: z.nativeEnum(TransactionType),
  categoryId: z.string().uuid("ID kategori tidak valid"),
  date: dateString(),
  description: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  id: z.string().uuid("ID transaksi tidak valid"),
});

const queryTypeEnum = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    if (Object.values(TransactionType).includes(v as TransactionType)) {
      return v as TransactionType;
    }
    return undefined;
  });

const queryEnumArray = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const arr = v.split(",").map((s) => s.trim());
    const valid = arr.filter((s) =>
      Object.values(TransactionType).includes(s as TransactionType)
    ) as TransactionType[];
    return valid.length > 0 ? valid : undefined;
  });

export const getTransactionsQuerySchema = z.object({
  type: queryEnumArray,
  categoryId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === null ? undefined : v)),
  startDate: dateString().optional().nullable(),
  endDate: dateString().optional().nullable(),
  search: z.string().optional().nullable(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;
