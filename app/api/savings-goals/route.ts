import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function GET() {
  await connection();
  try {
    const goals = await prisma.savingsGoal.findMany({
      include: {
        allocations: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = await Promise.all(
      goals.map(async (goal) => {
        // Sum over ALL allocations — the `take: 5` above only limits which
        // rows are returned for display, not what counts towards the progress.
        const total = await prisma.savingsAllocation.aggregate({
          where: { savingsGoalId: goal.id },
          _sum: { amount: true },
        });
        const currentAmount = total._sum.amount ?? 0;
        const progress =
          goal.targetAmount > 0
            ? Math.round((currentAmount / goal.targetAmount) * 1000) / 10
            : 0;

        return {
          ...goal,
          currentAmount,
          progressPercent: progress,
          isComplete: currentAmount >= goal.targetAmount,
        };
      })
    );

    return apiResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  await connection();
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Request body is required", 400);
    }

    const { name, description, targetAmount, targetDate } = body;

    if (!name || typeof name !== "string" || name.length === 0) {
      return apiError("Nama tujuan tabungan wajib diisi", 400);
    }

    if (!targetAmount || typeof targetAmount !== "number") {
      return apiError("targetAmount harus berupa angka", 400);
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        name: name.slice(0, 200),
        description: description ? description.slice(0, 500) : null,
        targetAmount: Math.trunc(targetAmount),
        targetDate: targetDate ? new Date(targetDate) : null,
        currentAmount: 0,
      },
    });

    return apiResponse(goal, 201);
  } catch (error) {
    return handleApiError(error);
  }
}