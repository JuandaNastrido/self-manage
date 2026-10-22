import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await context.params;
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!budget) {
      return apiError("Budget tidak ditemukan", 404);
    }

    return apiResponse(budget);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Request body is required", 400);
    }

    const { categoryId, amount } = body;

    const updateData: Record<string, unknown> = {};
    if (amount !== undefined) updateData.amount = parseInt(amount);

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return apiError("Kategori tidak ditemukan", 404);
      }
      if (category.type !== "EXPENSE") {
        return apiError("Budget hanya bisa dibuat untuk kategori pengeluaran", 400);
      }
      updateData.categoryId = categoryId;
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return apiResponse(budget);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await context.params;

    const existing = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError("Budget tidak ditemukan", 404);
    }

    await prisma.budget.delete({ where: { id } });

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}