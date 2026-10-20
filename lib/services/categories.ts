/**
 * Category service — manages transaction categories (income & expense types).
 */
import { Prisma, CategoryType } from "@prisma/client";
import { prisma } from "../prisma";
import { CreateCategoryInput, UpdateCategoryInput } from "../validators/category";

export class CategoryService {
  static async create(input: CreateCategoryInput) {
    return prisma.category.create({
      data: {
        name: input.name,
        type: input.type as CategoryType,
        color: input.color ?? null,
        icon: input.icon ?? null,
      },
    });
  }

  /**
   * Get all categories, optionally filtered by type.
   */
  static async list(type?: CategoryType) {
    const where: Prisma.CategoryWhereInput = {};
    if (type) {
      where.type = type;
    }
    return prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { transactions: true, budgets: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get a single category by ID.
   */
  static async getById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true, budgets: true },
        },
      },
    });
  }

  /**
   * Update a category.
   */
  static async update(id: string, input: UpdateCategoryInput) {
    const { id: _, ...data } = input;
    return prisma.category.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        color: data.color,
        icon: data.icon,
      },
    });
  }

  /**
   * Delete a category.
   * @throws if there are transactions using this category
   */
  static async delete(id: string) {
    const usageCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (usageCount > 0) {
      throw new Error(
        `Kategori ini digunakan oleh ${usageCount} transaksi. Hapus transaksi terkait dahulu.`
      );
    }

    return prisma.category.delete({ where: { id } });
  }

  /**
   * Get categories with their usage statistics.
   */
  static async getWithStats() {
    return prisma.category.findMany({
      include: {
        transactions: {
          select: { amount: true, type: true },
        },
      },
    });
  }
}
