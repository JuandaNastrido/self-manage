/**
 * Savings service — manages savings goals and allocations.
 * Progress is computed deterministically from allocation amounts.
 */
import { prisma } from "../prisma";
import { FinanceService } from "./finance";
import {
  CreateSavingsGoalInput,
  UpdateSavingsGoalInput,
  CreateSavingsAllocationInput,
} from "../validators/savings-goal";

export class SavingsService {
  /**
   * Create a new savings goal.
   */
  static async createGoal(input: CreateSavingsGoalInput) {
    if (input.targetAmount <= 0) {
      throw new Error("Target tabungan harus positif");
    }

    return prisma.savingsGoal.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate ?? null,
        currentAmount: 0,
      },
    });
  }

  /**
   * Get all savings goals with computed progress.
   */
  static async listGoals() {
    const goals = await prisma.savingsGoal.findMany({
      include: { allocations: true },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      goals.map(async (goal) => {
        // Always use calculated amount, not cached
        const calculated = await this.getCalculatedCurrent(goal.id);
        const progress = await FinanceService.calculateSavingsProgress({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate,
          currentAmount: calculated,
        });
        return {
          ...goal,
          currentAmount: calculated,
          progressPercent: progress.progressPercent,
          isComplete: progress.isComplete,
        };
      })
    );
  }

  /**
   * Get a single savings goal with allocations.
   */
  static async getGoal(id: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id },
      include: {
        allocations: {
          include: {
            transaction: {
              include: { category: true },
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!goal) return null;

    const calculated = await this.getCalculatedCurrent(goal.id);
    const progress = await FinanceService.calculateSavingsProgress({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      currentAmount: calculated,
    });

    return {
      ...goal,
      currentAmount: calculated,
      progressPercent: progress.progressPercent,
      isComplete: progress.isComplete,
    };
  }

  /**
   * Update a savings goal.
   */
  static async updateGoal(id: string, input: UpdateSavingsGoalInput) {
    const { id: _, ...data } = input;
    return prisma.savingsGoal.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description,
        targetAmount: data.targetAmount ?? undefined,
        targetDate: data.targetDate ?? undefined,
      },
    });
  }

  /**
   * Delete a savings goal (and its allocations).
   */
  static async deleteGoal(id: string) {
    return prisma.$transaction([
      prisma.savingsAllocation.deleteMany({ where: { savingsGoalId: id } }),
      prisma.savingsGoal.delete({ where: { id } }),
    ]);
  }

  /**
   * Get the calculated current amount from all allocations.
   */
  static async getCalculatedCurrent(goalId: string): Promise<number> {
    return FinanceService.recalculateSavingsGoalCurrent(goalId);
  }

  /**
   * Create a new allocation to a savings goal.
   * Also links to a transaction if provided.
   */
  static async createAllocation(input: CreateSavingsAllocationInput) {
    // Validate transaction if provided
    if (input.transactionId) {
      const txn = await prisma.transaction.findUnique({
        where: { id: input.transactionId },
      });
      if (!txn) {
        throw new Error("Transaksi tidak ditemukan");
      }
    }

    // Validate savings goal exists
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: input.savingsGoalId },
    });
    if (!goal) {
      throw new Error("Tujuan tabungan tidak ditemukan");
    }

    const allocation = await prisma.savingsAllocation.create({
      data: {
        savingsGoalId: input.savingsGoalId,
        transactionId: input.transactionId ?? null,
        amount: input.amount,
        date: input.date,
      },
    });

    // Recalculate goal's currentAmount (for display cache)
    const calculated = await this.getCalculatedCurrent(input.savingsGoalId);
    await prisma.savingsGoal.update({
      where: { id: input.savingsGoalId },
      data: { currentAmount: calculated },
    });

    return allocation;
  }

  /**
   * List all allocations for a savings goal.
   */
  static async listAllocations(goalId: string) {
    return prisma.savingsAllocation.findMany({
      where: { savingsGoalId: goalId },
      include: {
        transaction: {
          include: { category: true },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  /**
   * Delete an allocation and recalculate goal's current amount.
   */
  static async deleteAllocation(id: string) {
    const allocation = await prisma.savingsAllocation.findUnique({
      where: { id },
    });

    if (!allocation) {
      throw new Error("Alokasi tidak ditemukan");
    }

    await prisma.savingsAllocation.delete({ where: { id } });

    // Recalculate goal's currentAmount
    const calculated = await this.getCalculatedCurrent(allocation.savingsGoalId);
    await prisma.savingsGoal.update({
      where: { id: allocation.savingsGoalId },
      data: { currentAmount: calculated },
    });

    return allocation;
  }
}
