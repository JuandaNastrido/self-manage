import { TransactionType, TaskPriority, TaskStatus } from "@prisma/client";

/**
 * Shared TypeScript types for the application.
 * These are used by services, validators, and components.
 */

// ---- API Response wrapper ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

// ---- Input types for creating/updating records ----

export interface CategoryInput {
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
}

export interface TransactionInput {
  amount: number; // integer minor-unit
  type: TransactionType;
  categoryId: string;
  date: string; // ISO date string
  description?: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  plannedDurationMinutes?: number | null;
  taskCategoryId?: string | null;
}

export interface BudgetInput {
  categoryId: string;
  year: number;
  month: number;
  amount: number; // integer minor-unit
}

export interface SavingsGoalInput {
  name: string;
  description?: string;
  targetAmount: number; // integer minor-unit
  targetDate?: string | null;
}

export interface TimeEntryInput {
  taskId?: string | null;
  startTime: string; // ISO
  endTime: string; // ISO
  durationSeconds: number;
  description?: string;
}

// ---- Computed types ----

export interface MonthlyFinancialSummary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  balance: number;
  perCategory: Array<{
    categoryId: string;
    categoryName: string;
    type: TransactionType;
    totalAmount: number;
    transactionCount: number;
  }>;
}

export interface BudgetUtilization {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  year: number;
  month: number;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  utilizationPercent: number; // 0-100
  isOverBudget: boolean;
}

export interface SavingsProgress {
  goalId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number; // 0-100
  targetDate: Date | null;
  isComplete: boolean;
}

export interface TimerElapsed {
  elapsedSeconds: number;
  isRunning: boolean;
  isStale: boolean; // true if elapsed > STALE_THRESHOLD (8 hours)
}
