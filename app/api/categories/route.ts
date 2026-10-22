import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { createCategorySchema, getCategoriesQuerySchema } from "@/lib/validators/category";

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);

    const query = {
      type: searchParams.get("type"),
      search: searchParams.get("search"),
    };

    const validated = getCategoriesQuerySchema.parse(query);

    const categories = await prisma.category.findMany({
      where: validated.type ? { type: validated.type } : {},
      include: {
        _count: {
          select: { transactions: true, budgets: true },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return apiResponse(categories);
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

    const validated = createCategorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        name: validated.name,
        type: validated.type,
        color: validated.color ?? null,
        icon: validated.icon ?? null,
      },
    });

    return apiResponse(category, 201);
  } catch (error) {
    return handleApiError(error);
  }
}