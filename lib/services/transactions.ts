/**
 * Transaction service — handles CRUD operations with business logic.
 * This is a thin data-access layer; business logic lives in finance.ts service.
 */
import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../prisma";
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  GetTransactionsQuery,
} from "../validators/transaction";

export class TransactionService {
  /**
   * Create a new transaction.
   * Validates that the category type is compatible with the transaction type.
   */
  static async create(input: CreateTransactionInput) {
    // Verify category exists and type matches
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new Error("Kategori tidak ditemukan");
    }

    if (category.type === TransactionType.INCOME && input.type === TransactionType.EXPENSE) {
      throw new Error("Tidak bisa mencatat pengeluaran pada kategori pemasukan");
    }
    if (category.type === TransactionType.EXPENSE && input.type === TransactionType.INCOME) {
      throw new Error("Tidak bisa mencatat pemasukan pada kategori pengeluaran");
    }

    return prisma.transaction.create({
      data: {
        amount: input.amount,
        type: input.type,
        categoryId: input.categoryId,
        date: input.date,
        description: input.description ?? null,
      },
      include: { category: true },
    });
  }

  /**
   * Get a single transaction by ID.
   */
  static async getById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true, icon: true },
        },
      },
    });
  }

  /**
   * Get transactions with optional filtering.
   * Filters: type, categoryId, date range, search (in description)
   */
  static async list(query: GetTransactionsQuery) {
    const where: Prisma.TransactionWhereInput = {};

    if (query.type) {
      where.type = query.type.length === 1 ? query.type[0] : { in: query.type };
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = query.startDate;
      }
      if (query.endDate) {
        // Include entire end date
        const endOfDay = new Date(query.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.date.lte = endOfDay;
      }
    }

    if (query.search) {
      where.description = { contains: query.search };
    }

    return prisma.transaction.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true, icon: true },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  /**
   * Update an existing transaction.
   */
  static async update(id: string, input: UpdateTransactionInput) {
    const { id: _, ...data } = input;

    const updateData: Prisma.TransactionUpdateInput = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.type !== undefined) {
      // Verify category type compatibility
      const tx = await prisma.transaction.findUnique({
        where: { id },
        select: { categoryId: true },
      });
      if (tx) {
        const category = await prisma.category.findUnique({
          where: { id: tx.categoryId },
        });
        if (category && category.type === TransactionType.INCOME && data.type === TransactionType.EXPENSE) {
          throw new Error("Tidak bisa mengubah ke pengeluaran pada kategori pemasukan");
        }
        if (category && category.type === TransactionType.EXPENSE && data.type === TransactionType.INCOME) {
          throw new Error("Tidak bisa mengubah ke pemasukan pada kategori pengeluaran");
        }
      }
      updateData.type = data.type;
    }
    if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
    if (data.date !== undefined) updateData.date = data.date;
    if (data.description !== undefined) updateData.description = data.description;

    return prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  /**
   * Delete a transaction.
   * Note: This affects balance, budget utilization, and savings allocations.
   */
  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      // Delete any savings allocations referencing this transaction
      await tx.savingsAllocation.deleteMany({ where: { transactionId: id } });
      // Delete the transaction
      return tx.transaction.delete({ where: { id } });
    });
  }

  /**
   * Count total transactions (for pagination/metadata).
   */
  static async count(query?: Pick<GetTransactionsQuery, "type" | "categoryId" | "startDate" | "endDate">) {
    const where: Prisma.TransactionWhereInput = {};
    if (query?.type) where.type = query.type.length === 1 ? query.type[0] : { in: query.type };
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = query.startDate;
      if (query.endDate) where.date.lte = query.endDate;
    }
    return prisma.transaction.count({ where });
  }
}
