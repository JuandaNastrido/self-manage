import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { updateCategorySchema } from "@/lib/validators/category";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await context.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true, budgets: true },
        },
      },
    });

    if (!category) {
      return apiError("Kategori tidak ditemukan", 404);
    }

    return apiResponse(category);
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

    const validated = updateCategorySchema.parse({ ...body, id });

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: validated.name ?? undefined,
        color: validated.color,
        icon: validated.icon,
      },
    });

    return apiResponse(category);
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

    // Check if category has transactions
    const txnCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (txnCount > 0) {
      return apiError(
        `Kategori ini digunakan oleh ${txnCount} transaksi. Hapus transaksi terkait dahulu.`,
        400
      );
    }

    await prisma.category.delete({ where: { id } });

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}