import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const goal = await prisma.savingsGoal.findUnique({
      where: { id },
      include: {
        allocations: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!goal) {
      return apiError("Tujuan tabungan tidak ditemukan", 404);
    }

    // Calculate current amount from allocations
    const result = await prisma.savingsAllocation.aggregate({
      where: { savingsGoalId: id },
      _sum: { amount: true },
    });
    const currentAmount = result._sum.amount ?? 0;

    await prisma.savingsGoal.update({
      where: { id },
      data: { currentAmount },
    });

    const progressPercent =
      goal.targetAmount > 0
        ? Math.round((currentAmount / goal.targetAmount) * 1000) / 10
        : 0;

    return apiResponse({
      ...goal,
      currentAmount,
      progressPercent,
      isComplete: currentAmount >= goal.targetAmount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Request body is required", 400);
    }

    const { name, description, targetAmount, targetDate } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (targetAmount !== undefined) updateData.targetAmount = parseInt(targetAmount);
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: updateData,
    });

    return apiResponse(goal);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.savingsGoal.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError("Tujuan tabungan tidak ditemukan", 404);
    }

    await prisma.$transaction([
      prisma.savingsAllocation.deleteMany({ where: { savingsGoalId: id } }),
      prisma.savingsGoal.delete({ where: { id } }),
    ]);

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
