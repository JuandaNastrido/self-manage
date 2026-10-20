import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()));

    // 1. Calculate balance (deterministic, app logic)
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

    const budgetsWithUtilization = await Promise.all(
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

    // 5. Savings goals
    const savingsGoals = await prisma.savingsGoal.findMany({
      include: { allocations: true },
    });

    const savingsWithProgress = savingsGoals.map((goal) => {
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

    // 7. Active timer
    const activeTimer = await prisma.timerState.findFirst({
      where: { running: true },
      include: { task: true },
    });

    const summary = {
      balance,
      currency: "IDR",
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

    return apiResponse(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
