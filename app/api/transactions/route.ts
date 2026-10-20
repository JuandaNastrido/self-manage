import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { createTransactionSchema, getTransactionsQuerySchema } from "@/lib/validators/transaction";
import { TransactionType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query: Record<string, string | null> = {
      type: searchParams.get("type"),
      categoryId: searchParams.get("categoryId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      search: searchParams.get("search"),
    };

    // Parse type into array
    let typeArray: TransactionType[] | undefined;
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      typeArray = types
        .map((t) => {
          if (t === "INCOME") return TransactionType.INCOME;
          if (t === "EXPENSE") return TransactionType.EXPENSE;
          if (t === "REFUND") return TransactionType.REFUND;
          return null;
        })
        .filter(Boolean) as TransactionType[];
    }

    const where: any = {};

    if (typeArray && typeArray.length > 0) {
      where.type = { in: typeArray };
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    if (query.search) {
      where.description = { contains: query.search };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true, icon: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // Also fetch balance
    const result = await prisma.transaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    });
    let income = 0;
    let expenses = 0;
    for (const row of result) {
      const sum = row._sum.amount ?? 0;
      if (row.type === TransactionType.INCOME || row.type === TransactionType.REFUND) {
        income += sum;
      } else {
        expenses += sum;
      }
    }
    const balance = income - expenses;

    return apiResponse({
      transactions,
      balance,
      totalIncome: income,
      totalExpenses: expenses,
    });
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

    const validated = createTransactionSchema.parse(body);

    // Validate category exists and is compatible with transaction type
    const category = await prisma.category.findUnique({
      where: { id: validated.categoryId },
    });

    if (!category) {
      return apiError("Kategori tidak ditemukan", 404);
    }

    if (category.type === "INCOME" && validated.type === "EXPENSE") {
      return apiError(
        "Tidak bisa mencatat pengeluaran pada kategori pemasukan",
        400
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: validated.amount,
        type: validated.type,
        categoryId: validated.categoryId,
        date: validated.date,
        description: validated.description ?? null,
      },
      include: { category: true },
    });

    return apiResponse(transaction, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
