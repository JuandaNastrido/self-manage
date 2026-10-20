import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { updateTransactionSchema } from "@/lib/validators/transaction";
import { TransactionType } from "@prisma/client";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true, icon: true },
        },
      },
    });

    if (!transaction) {
      return apiError("Transaksi tidak ditemukan", 404);
    }

    return apiResponse(transaction);
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

    // Check if transaction exists
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError("Transaksi tidak ditemukan", 404);
    }

    // Validate category type if categoryId is being changed
    if (body.categoryId && body.categoryId !== existing.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: body.categoryId },
      });
      if (!category) {
        return apiError("Kategori tidak ditemukan", 404);
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        amount: body.amount ?? existing.amount,
        type: body.type ?? existing.type,
        categoryId: body.categoryId ?? existing.categoryId,
        date: body.date ? new Date(body.date) : existing.date,
        description: body.description ?? existing.description,
      },
      include: { category: true },
    });

    return apiResponse(updated);
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

    // Check if transaction exists
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError("Transaksi tidak ditemukan", 404);
    }

    await prisma.$transaction(async (tx) => {
      // Clear any savings allocation references
      await tx.savingsAllocation.updateMany({
        where: { transactionId: id },
        data: { transactionId: null },
      });
      await tx.transaction.delete({ where: { id } });
    });

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
