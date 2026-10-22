/**
 * Dashboard service — aggregates financial data, task statistics,
 * and timer state into a single summary view.
 *
 * All calculations are deterministic, using verified application logic.
 * Both the API route and the dashboard page consume this service so both
 * always render the exact same numbers.
 */
import { prisma } from "../prisma";
import type { Budget, Category, SavingsAllocation, SavingsGoal } from "@prisma/client";

export interface DashboardBudget extends Budget {
  category: Category;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  isOverBudget: boolean;
}

export interface DashboardSavingsGoal extends SavingsGoal {
  allocations: SavingsAllocation[];
  currentAmount: number;
  progressPercent: number;
  isComplete: boolean;
}

export interface DashboardData {
  balance: number;
  currency: string;
  monthly: {
    year: number;
    month: number;
    income: number;
    expenses: number;
    netCashFlow: number;
  };
  perCategory: Array<{
    categoryId: string;
    categoryName: string;
    type: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  budgets: DashboardBudget[];
  savingsGoals: DashboardSavingsGoal[];
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    date: Date;
    description: string | null;
    categoryName: string;
    categoryColor: string | null;
  }>;
  taskSummary: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    completionRate: number;
  };
  activeTimer: {
    id: string;
    taskId: string | null;
    taskTitle: string | null;
    startTime: string;
    pausedAt: string | null;
    accumulatedSeconds: number;
    running: boolean;
  } | null;
}

export class DashboardService {
  /**
   * Build the full dashboard summary for a given month.
   *
   * @param year - Calendar year (defaults to the current year)
   * @param month - Zero-based month index (defaults to the current month)
   */
  static async getDashboardData(
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth()
  ): Promise<DashboardData> {
    // 1. Balance (all-time)
    const txnGroup = await prisma.transaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    for (const row of txnGroup) {
      const sum = row._sum.amount ?? 0;
      if (row.type === "INCOME" || row.type === "REFUND") {
        totalIncome += sum;
      } else {
        totalExpenses += sum;
      }
    }
    const balance = totalIncome - totalExpenses;

    // 2. Monthly summary
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const monthlyGroup = await prisma.transaction.groupBy({
      by: ["type"],
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    for (const row of monthlyGroup) {
      const sum = row._sum.amount ?? 0;
      if (row.type === "INCOME" || row.type === "REFUND") {
        monthlyIncome += sum;
      } else {
        monthlyExpenses += sum;
      }
    }

    // 3. Per-category breakdown
    const categoryGroup = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const perCategory = categoryGroup.map((row) => {
      const cat = categoryMap.get(row.categoryId);
      return {
        categoryId: row.categoryId,
        categoryName: cat?.name ?? "Unknown",
        type: cat?.type ?? "UNKNOWN",
        totalAmount: row._sum.amount ?? 0,
        transactionCount: row._count._all ?? 0,
      };
    });

    // 4. Budgets with utilization
    const budgets = await prisma.budget.findMany({
      where: { year, month },
      include: { category: true },
    });

    const budgetsWithUtilization: DashboardBudget[] = await Promise.all(
      budgets.map(async (budget) => {
        const expenseSum = await prisma.transaction.aggregate({
          where: {
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });

        const refundSum = await prisma.transaction.aggregate({
          where: {
            categoryId: budget.categoryId,
            type: "REFUND",
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });

        const spent = (expenseSum._sum.amount ?? 0) - (refundSum._sum.amount ?? 0);
        const total = budget.amount;
        const util = total > 0 ? (spent / total) * 100 : 0;

        return {
          ...budget,
          spent,
          remaining: total - spent,
          utilizationPercent: Math.round(util * 10) / 10,
          isOverBudget: spent > total,
        };
      })
    );

    // 5. Savings goals with progress
    const savingsGoals = await prisma.savingsGoal.findMany({
      include: { allocations: true },
    });

    const savingsWithProgress: DashboardSavingsGoal[] = savingsGoals.map((goal) => {
      const currentAmount = goal.allocations.reduce((sum, a) => sum + a.amount, 0);
      const progress = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
      return {
        ...goal,
        currentAmount,
        progressPercent: Math.round(progress * 10) / 10,
        isComplete: currentAmount >= goal.targetAmount,
      };
    });

    // 6. Task summary
    const taskStats = await prisma.$transaction([
      prisma.task.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.task.count({ where: { status: "TODO" } }),
      prisma.task.count({ where: { status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { status: "DONE" } }),
      prisma.task.count({
        where: {
          status: { notIn: ["DONE", "ARCHIVED"] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    // 7. Recent transactions (last 10)
    const recentTxns = await prisma.transaction.findMany({
      take: 10,
      orderBy: { date: "desc" },
      include: { category: true },
    });
    const recentTransactions = recentTxns.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      date: t.date,
      description: t.description,
      categoryName: t.category.name,
      categoryColor: t.category.color,
    }));

    // 8. Active timer
    const activeTimer = await prisma.timerState.findFirst({
      where: { running: true },
      include: { task: true },
    });

    // 9. Currency preference
    const prefs = await prisma.userPreferences.findUnique({
      where: { id: "default" },
    });

    return {
      balance,
      currency: prefs?.currency ?? "IDR",
      monthly: {
        year,
        month,
        income: monthlyIncome,
        expenses: monthlyExpenses,
        netCashFlow: monthlyIncome - monthlyExpenses,
      },
      perCategory,
      budgets: budgetsWithUtilization,
      savingsGoals: savingsWithProgress,
      recentTransactions,
      taskSummary: {
        total: taskStats[0],
        todo: taskStats[1],
        inProgress: taskStats[2],
        done: taskStats[3],
        overdue: taskStats[4],
        completionRate: taskStats[0] > 0 ? (taskStats[3] / taskStats[0]) * 100 : 0,
      },
      activeTimer: activeTimer
        ? {
            id: activeTimer.id,
            taskId: activeTimer.taskId,
            taskTitle: activeTimer.task?.title ?? null,
            startTime: activeTimer.startTime.toISOString(),
            pausedAt: activeTimer.pausedAt?.toISOString() ?? null,
            accumulatedSeconds: activeTimer.accumulatedSeconds,
            running: activeTimer.running,
          }
        : null,
    };
  }
}
