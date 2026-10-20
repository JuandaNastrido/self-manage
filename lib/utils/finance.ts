/**
 * Pure financial calculation functions — no database dependency.
 * All computations use integer arithmetic (minor currency units).
 * These are the authoritative calculations; AI never replaces these.
 *
 * Business rules:
 * - Balance = Σ(INCOME) + Σ(REFUND) - Σ(EXPENSE)
 * - Budget utilization = (Σ(EXPENSE) - Σ(REFUND in same category)) / budget_amount * 100
 * - Savings progress = Σ(allocations) / target_amount * 100
 */
import { TransactionType } from "@prisma/client";

export interface SimpleTransaction {
  amount: number;
  type: TransactionType;
  categoryId?: string;
  date?: string | Date;
}

export interface SimpleBudget {
  categoryId: string;
  year: number;
  month: number;
  amount: number;
}

export interface SimpleSavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
}

export interface SimpleSavingsAllocation {
  savingsGoalId: string;
  amount: number;
}

export interface BudgetUtilizationResult {
  spent: number;
  budgetAmount: number;
  utilizationPercent: number;
}

export interface SavingsProgressResult {
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  isComplete: boolean;
}

export interface TransactionFilter {
  types?: TransactionType[];
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

/**
 * Calculate balance from a list of transactions.
 * Balance = Σ(INCOME + REFUND) - Σ(EXPENSE)
 */
export function calculateBalance(transactions: SimpleTransaction[]): number {
  return transactions.reduce((balance, tx) => {
    if (tx.type === TransactionType.INCOME || tx.type === TransactionType.REFUND) {
      return balance + tx.amount;
    }
    if (tx.type === TransactionType.EXPENSE) {
      return balance - tx.amount;
    }
    return balance;
  }, 0);
}

/**
 * Calculate budget utilization for a category in a given month.
 * Spent = Σ(EXPENSE in category+month) - Σ(REFUND in category+month)
 * Utilization % = spent / budget_amount * 100
 *
 * Important: Only EXPENSE and REFUND transactions in the SAME category and SAME month count.
 */
export function calculateBudgetUtilization(
  transactions: SimpleTransaction[],
  budget: SimpleBudget
): BudgetUtilizationResult {
  const { categoryId, year, month, amount: budgetAmount } = budget;

  // Filter transactions for this category in this month
  // Note: We consider REFUND transactions to reduce budget spent
  // because a refund is a correction to a previous expense.
  const categoryTxns = transactions.filter(
    (tx) => tx.categoryId === categoryId
  );

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  let spent = 0;

  for (const tx of categoryTxns) {
    if (!tx.date) continue;

    const txDate = typeof tx.date === "string" ? new Date(tx.date) : tx.date;

    // Check if transaction date is within the month
    if (txDate < start || txDate > end) continue;

    if (tx.type === TransactionType.EXPENSE) {
      spent += tx.amount;
    } else if (tx.type === TransactionType.REFUND) {
      // Refund reduces spending in the same category
      spent -= tx.amount;
    }
    // INCOME in an expense category is unusual — ignore for budget calc
  }

  // Ensure non-negative spent (budget can't be negative)
  spent = Math.max(0, spent);

  const utilizationPercent =
    budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

  return {
    spent,
    budgetAmount,
    utilizationPercent: Math.round(utilizationPercent * 10) / 10,
  };
}

/**
 * Calculate savings goal progress from allocations.
 */
export function calculateSavingsProgress(
  allocations: SimpleSavingsAllocation[],
  goal: SimpleSavingsGoal
): SavingsProgressResult {
  const currentAmount = allocations
    .filter((a) => a.savingsGoalId === goal.id)
    .reduce((sum, a) => sum + a.amount, 0);

  const progressPercent =
    goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;

  return {
    currentAmount,
    targetAmount: goal.targetAmount,
    progressPercent: Math.round(progressPercent * 10) / 10,
    isComplete: currentAmount >= goal.targetAmount,
  };
}

/**
 * Filter transactions based on a filter object.
 */
export function filterTransactions(
  transactions: SimpleTransaction[],
  filter: TransactionFilter
): SimpleTransaction[] {
  return transactions.filter((tx) => {
    if (filter.types && filter.types.length > 0) {
      if (!filter.types.includes(tx.type)) return false;
    }

    if (filter.categoryId && tx.categoryId !== filter.categoryId) {
      return false;
    }

    if (filter.startDate || filter.endDate) {
      if (!tx.date) return false;
      const d = typeof tx.date === "string" ? new Date(tx.date) : tx.date;
      if (filter.startDate && d < filter.startDate) return false;
      if (filter.endDate && d > filter.endDate) return false;
    }

    return true;
  });
}

/**
 * Calculate monthly summary from a list of transactions.
 * Groups transactions by month and category.
 */
export function calculateMonthlySummary(
  transactions: SimpleTransaction[],
  year: number,
  month: number
): {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  balance: number;
  perCategory: Record<string, { total: number; count: number }>;
} {
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const monthly = transactions.filter((tx) => {
    if (!tx.date) return false;
    const d = typeof tx.date === "string" ? new Date(tx.date) : tx.date;
    return d >= start && d <= end;
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const perCategory: Record<string, { total: number; count: number }> = {};

  for (const tx of monthly) {
    const catId = tx.categoryId || "unknown";

    if (!perCategory[catId]) {
      perCategory[catId] = { total: 0, count: 0 };
    }

    if (tx.type === TransactionType.INCOME || tx.type === TransactionType.REFUND) {
      totalIncome += tx.amount;
      perCategory[catId].total += tx.amount;
    } else if (tx.type === TransactionType.EXPENSE) {
      totalExpenses += tx.amount;
      perCategory[catId].total += tx.amount;
    }

    perCategory[catId].count += 1;
  }

  return {
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    balance: totalIncome - totalExpenses,
    perCategory,
  };
}
