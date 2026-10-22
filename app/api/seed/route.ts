import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, handleApiError } from "@/lib/utils/api-helpers";
import { TransactionType } from "@prisma/client";

/**
 * Seed endpoint Ã¢â‚¬â€ creates default categories and an empty transaction database.
 * This is useful for first-time setup.
 * POST /api/seed
 */
export async function POST() {
  await connection();
  try {
    // Check if already seeded
    const count = await prisma.category.count();
    if (count > 0) {
      return apiResponse({
        seeded: false,
        message: "Database sudah berisi kategori. Seeding tidak diperlukan.",
        categoryCount: count,
      });
    }

    // Create default income categories
    const incomeCategories = await prisma.category.createMany({
      data: [
        { name: "Gaji", type: TransactionType.INCOME, color: "#10B981" },
        { name: "Bonus", type: TransactionType.INCOME, color: "#059669" },
        { name: "Pendapatan Lainnya", type: TransactionType.INCOME, color: "#047857" },
      ],
    });

    // Create default expense categories
    const expenseCategories = await prisma.category.createMany({
      data: [
        { name: "Makanan & Minuman", type: TransactionType.EXPENSE, color: "#EF4444" },
        { name: "Transportasi", type: TransactionType.EXPENSE, color: "#F59E0B" },
        { name: "Tagihan Utility", type: TransactionType.EXPENSE, color: "#8B5CF6" },
        { name: "Hiburan", type: TransactionType.EXPENSE, color: "#EC4899" },
        { name: "Belanja", type: TransactionType.EXPENSE, color: "#0EA5E9" },
        { name: "Kesehatan", type: TransactionType.EXPENSE, color: "#06B6D4" },
        { name: "Pendidikan", type: TransactionType.EXPENSE, color: "#84CC16" },
        { name: "Lainnya", type: TransactionType.EXPENSE, color: "#6B7280" },
      ],
    });

    // Create default user preferences
    await prisma.userPreferences.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        currency: "IDR",
        timezone: "Asia/Jakarta",
      },
    });

    const total = incomeCategories.count + expenseCategories.count;

    return apiResponse({
      seeded: true,
      message: `Berhasil membuat ${total} kategori default`,
      incomeCategories: incomeCategories.count,
      expenseCategories: expenseCategories.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}