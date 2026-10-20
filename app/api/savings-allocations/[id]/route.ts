import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const allocation = await prisma.savingsAllocation.findUnique({
      where: { id },
    });

    if (!allocation) {
      return apiError("Alokasi tidak ditemukan", 404);
    }

    await prisma.savingsAllocation.delete({ where: { id: allocation.id } });

    // Recalculate goal current amount
    const result = await prisma.savingsAllocation.aggregate({
      where: { savingsGoalId: allocation.savingsGoalId },
      _sum: { amount: true },
    });
    const currentAmount = result._sum.amount ?? 0;

    await prisma.savingsGoal.update({
      where: { id: allocation.savingsGoalId },
      data: { currentAmount },
    });

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
