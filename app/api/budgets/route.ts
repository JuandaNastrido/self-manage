import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { FinanceService } from "@/lib/services/finance";

export async function GET() {
  try {
    // Get budgets with utilization
    const budgets = await prisma.budget.findMany({
      include: { category: true },
      orderBy: [{ year: "desc" }, { month: "desc" }, { category: { name: "asc" } }],
    });

    const result = await Promise.all(
      budgets.map(async (budget) => {
        const util = await FinanceService.calculateBudgetUtilization(
          budget.categoryId,
          budget.year,
          budget.month
        );
        return {
          ...budget,
          spent: util.spent,
          remaining: budget.amount - util.spent,
          utilizationPercent: util.utilizationPercent,
          isOverBudget: util.spent > budget.amount,
        };
      })
    );

    return apiResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Request body is required", 400);
    }

    const { categoryId, year, month, amount } = body;

    if (!categoryId || year === undefined || month === undefined || amount === undefined) {
      return apiError("categoryId, year, month, amount semuanya diperlukan", 400);
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return apiError("Kategori tidak ditemukan", 404);
    }

    if (category.type !== "EXPENSE") {
      return apiError("Budget hanya bisa dibuat untuk kategori pengeluaran", 400);
    }

    const budget = await prisma.budget.upsert({
      where: {
        categoryId_year_month: {
          categoryId,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      update: { amount: parseInt(amount) },
      create: {
        categoryId,
        year: parseInt(year),
        month: parseInt(month),
        amount: parseInt(amount),
      },
      include: { category: true },
    });

    return apiResponse(budget, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
