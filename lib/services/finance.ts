/**
 * Deterministic financial calculation utilities.
 * All monetary operations use INTEGER arithmetic (minor currency units).
 * No floating-point arithmetic is used for financial calculations.
 *
 * Rules:
 * - INCOME: increases balance
 * - EXPENSE: decreases balance, counts toward budget "spent"
 * - REFUND: increases balance (money returned), reduces budget "spent" in same category
 *
 * Balance = Σ(INCOME) + Σ(REFUND) - Σ(EXPENSE)
 * Budget spent = Σ(EXPENSE in category+month) - Σ(REFUND in category+month)
 */
import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../prisma";
import { MonthlyFinancialSummary, SavingsProgress } from "../types";

export class FinanceService {
  /**
   * Calculate balance from all transactions.
   * Balance = Σ(INCOME + REFUND) - Σ(EXPENSE)
   */
  static async calculateBalance(): Promise<number> {
    const result = await prisma.transaction.groupBy({
      by: ["type"],
      _sum: {
        amount: true,
      },
    });

    let income = 0;
    let expenses = 0;

    for (const row of result) {
      const sum = row._sum.amount ?? 0;
      if (row.type === TransactionType.INCOME || row.type === TransactionType.REFUND) {
        income += sum;
      } else if (row.type === TransactionType.EXPENSE) {
        expenses += sum;
      }
    }

    return income - expenses;
  }

  /**
   * Calculate monthly financial summary.
   * Includes total income, expenses, net cash flow, and per-category breakdown.
   */
  static async calculateMonthlySummary(
    year: number,
    month: number
  ): Promise<MonthlyFinancialSummary> {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const where: Prisma.TransactionWhereInput = {
      date: {
        gte: start,
        lte: end,
      },
    };

    // Get per-category totals
    const categoryResults = await prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    // Build per-category map
    const categoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        type: TransactionType;
        totalAmount: number;
        transactionCount: number;
      }
    >();

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of categoryResults) {
      // Fetch category name
      const category = await prisma.category.findUnique({
        where: { id: row.categoryId },
        select: { name: true, type: true },
      });

      if (!category) continue;

      const key = `${row.categoryId}`;
      const sum = row._sum.amount ?? 0;

      if (row.type === TransactionType.INCOME || row.type === TransactionType.REFUND) {
        totalIncome += sum;
      } else if (row.type === TransactionType.EXPENSE) {
        totalExpenses += sum;
      }

      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: row.categoryId,
          categoryName: category.name,
          type: category.type,
          totalAmount: 0,
          transactionCount: 0,
        });
      }

      const existing = categoryMap.get(key)!;
      existing.totalAmount += sum;
      existing.transactionCount += row._count._all ?? 0;
    }

    // Calculate budget spent for each budget
    const perCategory = Array.from(categoryMap.values());

    return {
      year,
      month,
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      balance: totalIncome - totalExpenses, // Simplified: same as cash flow for monthly
      perCategory,
    };
  }

  /**
   * Calculate budget utilization for a specific category and month.
   * Budget spent = Σ(EXPENSE in category+month) - Σ(REFUND in category+month)
   */
  static async calculateBudgetUtilization(
    categoryId: string,
    year: number,
    month: number
  ): Promise<{ spent: number; budgetAmount: number; utilizationPercent: number }> {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // Find the budget for this category + month
    const budget = await prisma.budget.findFirst({
      where: {
        categoryId,
        year,
        month,
      },
    });

    if (!budget) {
      return { spent: 0, budgetAmount: 0, utilizationPercent: 0 };
    }

    // Sum EXPENSE and REFUND transactions for this category in this month
    const expenseSum = await prisma.transaction.aggregate({
      where: {
        categoryId,
        type: TransactionType.EXPENSE,
        date: { gte: start, lte: end },
      },
      _sum: {
        amount: true,
      },
    });

    const refundSum = await prisma.transaction.aggregate({
      where: {
        categoryId,
        type: TransactionType.REFUND,
        date: { gte: start, lte: end },
      },
      _sum: {
        amount: true,
      },
    });

    const expenses = expenseSum._sum.amount ?? 0;
    const refunds = refundSum._sum.amount ?? 0;
    const spent = expenses - refunds; // Net spending

    const util = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      spent,
      budgetAmount: budget.amount,
      utilizationPercent: Math.round(util * 10) / 10, // Round to 1 decimal
    };
  }

  /**
   * Calculate savings goal progress.
   * progress = currentAmount / targetAmount * 100
   */
  static async calculateSavingsProgress(goal: {
    id: string;
    name: string;
    targetAmount: number;
    targetDate: Date | null;
    currentAmount: number;
  }): Promise<SavingsProgress> {
    const progress =
      goal.targetAmount > 0
        ? (goal.currentAmount / goal.targetAmount) * 100
        : 0;

    return {
      goalId: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      progressPercent: Math.round(progress * 10) / 10,
      targetDate: goal.targetDate,
      isComplete: goal.currentAmount >= goal.targetAmount,
    };
  }

  /**
   * Recalculate savings goal current amount from allocations.
   * This is the authoritative source — called when allocations change.
   */
  static async recalculateSavingsGoalCurrent(goalId: string): Promise<number> {
    const result = await prisma.savingsAllocation.aggregate({
      where: { savingsGoalId: goalId },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount ?? 0;
  }

  /**
   * Calculate total balance across all transactions (alias for clarity).
   */
  static async getAvailableBalance(): Promise<number> {
    return FinanceService.calculateBalance();
  }
}
