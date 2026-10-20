/**
 * Unit tests for deterministic financial calculations.
 * Tests verify the core calculation rules without any AI involvement.
 *
 * Business rules:
 * - Balance = Σ(INCOME + REFUND) - Σ(EXPENSE)
 * - Budget util = (EXPENSEs in category+month) / budget_amount
 * - Savings progress = Σ(allocations) / target_amount
 */
import {
  calculateBalance,
  calculateBudgetUtilization,
  calculateSavingsProgress,
  calculateMonthlySummary,
  filterTransactions,
} from "@/lib/utils/finance";
import { TransactionType } from "@prisma/client";

const TXNS = [
  { amount: 5000000, type: TransactionType.INCOME, categoryId: "cat-salary" },
  { amount: 1500000, type: TransactionType.EXPENSE, categoryId: "cat-food" },
  { amount: 800000, type: TransactionType.EXPENSE, categoryId: "cat-transport" },
  { amount: 200000, type: TransactionType.EXPENSE, categoryId: "cat-food" },
  { amount: 100000, type: TransactionType.REFUND, categoryId: "cat-food" },
  { amount: 1000000, type: TransactionType.INCOME, categoryId: "cat-bonus" },
];

describe("calculateBalance", () => {
  it("calculates correct balance: income + refund - expense", () => {
    const balance = calculateBalance(TXNS);

    // Income: 5000000 + 1000000 = 6000000
    // Refund: 100000
    // Expense: 1500000 + 800000 + 200000 = 2500000
    // Balance: 6000000 + 100000 - 2500000 = 3600000
    expect(balance).toBe(3600000);
  });

  it("handles empty transactions", () => {
    expect(calculateBalance([])).toBe(0);
  });

  it("no floating-point errors", () => {
    const txns = Array.from({ length: 10 }, () => ({
      amount: 100001,
      type: TransactionType.INCOME,
      categoryId: "cat-test",
    }));
    expect(calculateBalance(txns)).toBe(1000010);
  });

  it("excludes deleted transactions (they're simply not in the array)", () => {
    const original = [...TXNS];
    const afterDeletion = original.filter((t) => t !== original[2]); // remove one expense
    const before = calculateBalance(original);
    const after = calculateBalance(afterDeletion);
    // The deleted transaction was 800000 EXPENSE
    expect(after - before).toBe(800000);
  });
});

describe("calculateBudgetUtilization", () => {
  const budget = {
    categoryId: "cat-food",
    year: 2024,
    month: 9, // October
    amount: 2000000,
  };

  const txnsWithDates = [
    { amount: 1500000, type: TransactionType.EXPENSE, categoryId: "cat-food", date: "2024-10-05" },
    { amount: 200000, type: TransactionType.EXPENSE, categoryId: "cat-food", date: "2024-10-15" },
    { amount: 100000, type: TransactionType.REFUND, categoryId: "cat-food", date: "2024-10-20" },
    { amount: 500000, type: TransactionType.EXPENSE, categoryId: "cat-food", date: "2024-09-01" }, // different month
    { amount: 1000000, type: TransactionType.EXPENSE, categoryId: "cat-transport", date: "2024-10-10" },
  ];

  it("calculates correct budget utilization for a month", () => {
    const result = calculateBudgetUtilization(txnsWithDates, budget);

    // Spent in October for cat-food: 1500000 + 200000 - 100000 (refund) = 1600000
    // Utilization: 1600000 / 2000000 * 100 = 80%
    expect(result.spent).toBe(1600000);
    expect(result.budgetAmount).toBe(2000000);
    expect(result.utilizationPercent).toBe(80.0);
  });

  it("ignores transactions outside the month", () => {
    const result = calculateBudgetUtilization(txnsWithDates, budget);
    expect(result.spent).toBe(1600000); // 500000 from September is excluded
  });

  it("ignores transactions in other categories", () => {
    const result = calculateBudgetUtilization(txnsWithDates, budget);
    expect(result.spent).toBe(1600000); // transport not counted
  });

  it("handles refund reducing spent amount", () => {
    const result = calculateBudgetUtilization(txnsWithDates, budget);
    expect(result.spent).toBe(1600000); // 1500k + 200k - 100k refund = 1600k
  });

  it("handles 0% utilization when no transactions", () => {
    const result = calculateBudgetUtilization([], budget);
    expect(result.spent).toBe(0);
    expect(result.utilizationPercent).toBe(0);
  });

  it("handles zero budget amount without crash", () => {
    const zeroBudget = { ...budget, amount: 0 };
    const result = calculateBudgetUtilization(txnsWithDates, zeroBudget);
    expect(result.utilizationPercent).toBe(0);
  });

  it("handles over-budget spending", () => {
    const smallBudget = { ...budget, amount: 1000000 };
    const result = calculateBudgetUtilization(txnsWithDates, smallBudget);
    expect(result.spent).toBe(1600000);
    expect(result.utilizationPercent).toBe(160.0);
  });
});

describe("calculateSavingsProgress", () => {
  const goal = { id: "goal-1", name: "Liburan", targetAmount: 5000000 };

  it("calculates correct progress", () => {
    const allocations = [
      { savingsGoalId: "goal-1", amount: 1000000 },
      { savingsGoalId: "goal-1", amount: 500000 },
      { savingsGoalId: "goal-2", amount: 300000 }, // different goal, ignored
    ];

    const result = calculateSavingsProgress(allocations, goal);

    // Current: 1000000 + 500000 = 1500000
    // Target: 5000000
    // Progress: 30%
    expect(result.currentAmount).toBe(1500000);
    expect(result.targetAmount).toBe(5000000);
    expect(result.progressPercent).toBe(30.0);
    expect(result.isComplete).toBe(false);
  });

  it("marks goal complete when reached", () => {
    const allocations = [
      { savingsGoalId: "goal-1", amount: 4000000 },
      { savingsGoalId: "goal-1", amount: 1000000 },
    ];

    const result = calculateSavingsProgress(allocations, goal);

    expect(result.currentAmount).toBe(5000000);
    expect(result.progressPercent).toBe(100);
    expect(result.isComplete).toBe(true);
  });

  it("handles goals exceeding target", () => {
    const allocations = [
      { savingsGoalId: "goal-1", amount: 6000000 },
    ];

    const result = calculateSavingsProgress(allocations, goal);

    expect(result.progressPercent).toBe(120);
    expect(result.isComplete).toBe(true);
  });

  it("handles no allocations", () => {
    const result = calculateSavingsProgress([], goal);

    expect(result.currentAmount).toBe(0);
    expect(result.progressPercent).toBe(0);
    expect(result.isComplete).toBe(false);
  });
});

describe("calculateMonthlySummary", () => {
  const txnsWithDates = [
    { amount: 5000000, type: TransactionType.INCOME, categoryId: "salary", date: "2024-10-01" },
    { amount: 1500000, type: TransactionType.EXPENSE, categoryId: "food", date: "2024-10-05" },
    { amount: 800000, type: TransactionType.EXPENSE, categoryId: "transport", date: "2024-10-10" },
    { amount: 200000, type: TransactionType.EXPENSE, categoryId: "food", date: "2024-10-15" },
    { amount: 5000000, type: TransactionType.INCOME, categoryId: "salary", date: "2024-09-01" },
    { amount: 1000000, type: TransactionType.EXPENSE, categoryId: "food", date: "2024-09-15" },
  ];

  it("calculates monthly income, expenses, and net cash flow", () => {
    const result = calculateMonthlySummary(txnsWithDates, 2024, 9); // October

    expect(result.totalIncome).toBe(5000000); // only October income
    expect(result.totalExpenses).toBe(2500000); // 1500000 + 800000 + 200000
    expect(result.netCashFlow).toBe(2500000);
    expect(result.balance).toBe(2500000);
  });

  it("groups by category correctly", () => {
    const result = calculateMonthlySummary(txnsWithDates, 2024, 9);

    expect(result.perCategory["food"].total).toBe(1700000); // 1500000 + 200000
    expect(result.perCategory["food"].count).toBe(2);
    expect(result.perCategory["transport"].total).toBe(800000);
    expect(result.perCategory["transport"].count).toBe(1);
    expect(result.perCategory["salary"].total).toBe(5000000);
  });

  it("returns empty summary for month with no transactions", () => {
    const result = calculateMonthlySummary(txnsWithDates, 2024, 0); // January

    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.netCashFlow).toBe(0);
    expect(Object.keys(result.perCategory)).toHaveLength(0);
  });
});

describe("transactions crossing month boundaries", () => {
  it("transaction dated Oct 31 counts toward October budget, not November", () => {
    const budget = {
      categoryId: "cat-test",
      year: 2024,
      month: 9, // October
      amount: 1000000,
    };

    // A transaction dated October 31 recorded on November 1
    const txns = [
      { amount: 500000, type: TransactionType.EXPENSE, categoryId: "cat-test", date: "2024-10-31T23:59:59" },
    ];

    const result = calculateBudgetUtilization(txns, budget);
    expect(result.spent).toBe(500000);
    expect(result.utilizationPercent).toBe(50.0);
  });
});

describe("filterTransactions", () => {
  it("filters by type", () => {
    const result = filterTransactions(TXNS, {
      types: [TransactionType.EXPENSE],
    });
    expect(result).toHaveLength(3);
    expect(result.every((t) => t.type === "EXPENSE")).toBe(true);
  });

  it("filters by category", () => {
    const result = filterTransactions(TXNS, {
      categoryId: "cat-food",
    });
    expect(result).toHaveLength(2);
  });

  it("filters by date range", () => {
    const result = filterTransactions([], {});
    expect(result).toHaveLength(0);
  });
});
