/**
 * Budget service — manages monthly budgets with utilization calculation.
 * Budgets link to Expense categories only. Utilization is computed deterministically.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { FinanceService } from "./finance";
import { CreateBudgetInput, UpdateBudgetInput } from "../validators/budget";

export class BudgetService {
  /**
   * Create or update a monthly budget.
   * @throws if category type is not EXPENSE
   */
  static async create(input: CreateBudgetInput) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new Error("Kategori tidak ditemukan");
    }

    if (category.type !== "EXPENSE") {
      throw new Error("Budget hanya bisa dibuat untuk kategori pengeluaran");
    }

    // Use upsert to update existing budget for same month+category
    return prisma.budget.upsert({
      where: {
        categoryId_year_month: {
          categoryId: input.categoryId,
          year: input.year,
          month: input.month,
        },
      },
      update: {
        amount: input.amount,
      },
      create: {
        categoryId: input.categoryId,
        year: input.year,
        month: input.month,
        amount: input.amount,
      },
      include: { category: true },
    });
  }

  /**
   * Get all budgets, optionally filtered by year/month.
   */
  static async list(year?: number, month?: number) {
    const where: Prisma.BudgetWhereInput = {};
    if (year !== undefined) where.year = year;
    if (month !== undefined) where.month = month;

    return prisma.budget.findMany({
      where,
      include: { category: true },
      orderBy: [{ year: "desc" }, { month: "desc" }, { category: { name: "asc" } }],
    });
  }

  /**
   * Get a single budget by ID.
   */
  static async getById(id: string) {
    return prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  /**
   * Update a budget.
   */
  static async update(id: string, input: UpdateBudgetInput) {
    const { id: _, ...data } = input;

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (category && category.type !== "EXPENSE") {
        throw new Error("Budget hanya bisa dibuat untuk kategori pengeluaran");
      }
    }

    return prisma.budget.update({
      where: { id },
      data: data.categoryId
        ? {
            categoryId: data.categoryId,
            year: data.year ?? undefined,
            month: data.month ?? undefined,
            amount: data.amount ?? undefined,
          }
        : {
            year: data.year ?? undefined,
            month: data.month ?? undefined,
            amount: data.amount ?? undefined,
          },
      include: { category: true },
    });
  }

  /**
   * Delete a budget.
   */
  static async delete(id: string) {
    return prisma.budget.delete({ where: { id } });
  }

  /**
   * Get budgets with utilization data for a specific month.
   */
  static async listWithUtilization(year: number, month: number) {
    const budgets = await this.list(year, month);

    const results = await Promise.all(
      budgets.map(async (budget) => {
        const util = await FinanceService.calculateBudgetUtilization(
          budget.categoryId,
          budget.year,
          budget.month
        );
        return {
          ...budget,
          spent: util.spent,
          remaining: util.budgetAmount - util.spent,
          utilizationPercent: util.utilizationPercent,
          isOverBudget: util.spent > util.budgetAmount,
        };
      })
    );

    return results;
  }
}
