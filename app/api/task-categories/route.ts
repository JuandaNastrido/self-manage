import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function GET() {
  await connection();
  try {
    const categories = await prisma.taskCategory.findMany({
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { name: "asc" },
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

    const { name, color } = body;

    if (!name || typeof name !== "string" || name.length === 0) {
      return apiError("Nama kategori tugas wajib diisi", 400);
    }

    const category = await prisma.taskCategory.create({
      data: {
        name: name.slice(0, 100),
        color: color ?? null,
      },
    });

    return apiResponse(category, 201);
  } catch (error) {
    return handleApiError(error);
  }
}