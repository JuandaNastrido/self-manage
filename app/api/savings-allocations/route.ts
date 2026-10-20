import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get("goalId");

    const where: Record<string, unknown> = {};
    if (goalId) (where as any).savingsGoalId = goalId;

    const allocations = await prisma.savingsAllocation.findMany({
      where,
      include: {
        savingsGoal: true,
        transaction: {
          include: { category: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return apiResponse(allocations);
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

    const { savingsGoalId, transactionId, amount, date } = body;

    if (!savingsGoalId || !amount || !date) {
      return apiError("savingsGoalId, amount, dan date diperlukan", 400);
    }

    // Validate savings goal exists
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: savingsGoalId },
    });

    if (!goal) {
      return apiError("Tujuan tabungan tidak ditemukan", 404);
    }

    // Validate transaction if provided
    if (transactionId) {
      const txn = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
      if (!txn) {
        return apiError("Transaksi tidak ditemukan", 404);
      }
    }

    const allocation = await prisma.savingsAllocation.create({
      data: {
        savingsGoalId,
        transactionId: transactionId ?? null,
        amount: parseInt(amount),
        date: new Date(date),
      },
    });

    // Recalculate goal current amount
    const result = await prisma.savingsAllocation.aggregate({
      where: { savingsGoalId },
      _sum: { amount: true },
    });
    const currentAmount = result._sum.amount ?? 0;

    await prisma.savingsGoal.update({
      where: { id: savingsGoalId },
      data: { currentAmount },
    });

    return apiResponse(allocation, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
