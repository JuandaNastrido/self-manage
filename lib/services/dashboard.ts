/**
 * Dashboard service — aggregates financial data, task statistics,
 * and timer state into a single summary view.
 * All calculations are deterministic, using verified application logic.
 */
import { Prisma, TaskStatus, TaskPriority } from "@prisma/client";
import { prisma } from "../prisma";
import { FinanceService } from "./finance";
import { TimerService } from "./timer";

export interface DashboardSummary {
  balance: number;
  currency: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNetCashFlow: number;
  activeBudgets: number;
  overBudgetCategories: number;
  totalSavingsGoals: number;
  totalSavingsProgress: number;
  taskSummary: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    completionRate: number;
  };
  topExpenseCategories: Array<{
    categoryId: string;
    categoryName: string;
    color: string | null;
    total: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    date: Date;
    description: string | null;
    categoryName: string;
    categoryColor: string | null;
  }>;
  activeTimer: {
    running: boolean;
    taskId: string | null;
    taskTitle: string | null;
    elapsedSeconds: number;
  } | null;
}

export class DashboardService {
  /**
   * Get complete dashboard summary for the current month.
   * All metrics computed from verified application logic.
   */
  static async getSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // 1. Balance
    const balance = await FinanceService.calculateBalance();

    // 2. Monthly financial summary
    const monthlySummary = await FinanceService.calculateMonthlySummary(year, month);

    // 3. Budget status
    const budgets = await prisma.budget.findMany({
      where: { year, month },
      include: { category: true },
    });
    const overBudget = await Promise.all(
      budgets.map(async (b) => {
        const util = await FinanceService.calculateBudgetUtilization(
          b.categoryId, year, month
        );
        return { ...b, spent: util.spent, overBudget: util.spent > b.amount };
      })
    );
    const overBudgetCount = overBudget.filter((b) => b.overBudget).length;

    // 4. Savings goals
    const savingsGoals = await prisma.savingsGoal.findMany();
    const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalCurrent = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
    const savingsProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    // 5. Task summary
    const taskCounts = await prisma.$transaction([
      prisma.task.count({ where: { status: { not: TaskStatus.ARCHIVED } } }),
      prisma.task.count({ where: { status: TaskStatus.TODO } }),
      prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      prisma.task.count({ where: { status: TaskStatus.DONE } }),
      prisma.task.count({
        where: {
          status: { notIn: [TaskStatus.DONE, TaskStatus.ARCHIVED] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const taskSummary = {
      total: taskCounts[0],
      todo: taskCounts[1],
      inProgress: taskCounts[2],
      done: taskCounts[3],
      overdue: taskCounts[4],
      completionRate: taskCounts[0] > 0 ? (taskCounts[3] / taskCounts[0]) * 100 : 0,
    };

    // 6. Top expense categories (by total spending this month)
    const expenseCategoryTotals = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        type: { in: ["EXPENSE", "REFUND"] },
        date: {
          gte: new Date(Date.UTC(year, month, 1)),
          lte: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
        },
      },
      _sum: { amount: true },
    });

    const categoryTotals = await Promise.all(
      expenseCategoryTotals.map(async (row) => {
        const cat = await prisma.category.findUnique({
          where: { id: row.categoryId },
          select: { name: true, color: true },
        });
        return {
          categoryId: row.categoryId,
          categoryName: cat?.name ?? "Unknown",
          color: cat?.color ?? null,
          total: row._sum.amount ?? 0,
        };
      })
    );

    const topExpenseCategories = categoryTotals
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

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

    // 8. Active timer state
    const timerState = await TimerService.getTimerState();
    let activeTimer = null;
    if (timerState && timerState.running) {
      const elapsed = TimerService.calculateElapsed(timerState);
      let taskTitle: string | null = null;
      if (timerState.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: timerState.taskId },
          select: { title: true },
        });
        taskTitle = task?.title ?? null;
      }
      activeTimer = {
        running: true,
        taskId: timerState.taskId,
        taskTitle,
        elapsedSeconds: elapsed.elapsedSeconds,
      };
    }

    // Get currency from user preferences
    const prefs = await prisma.userPreferences.findUnique({
      where: { id: "default" },
    });

    return {
      balance,
      currency: prefs?.currency ?? "IDR",
      monthlyIncome: monthlySummary.totalIncome,
      monthlyExpenses: monthlySummary.totalExpenses,
      monthlyNetCashFlow: monthlySummary.netCashFlow,
      activeBudgets: budgets.length,
      overBudgetCategories: overBudgetCount,
      totalSavingsGoals: savingsGoals.length,
      totalSavingsProgress: Math.round(savingsProgress * 10) / 10,
      taskSummary,
      topExpenseCategories,
      recentTransactions,
      activeTimer,
    };
  }
}
