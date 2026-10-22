import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";

export async function GET() {
  await connection();
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { id: "default" },
    });

    if (!prefs) {
      // Create default preferences if not exists
      const created = await prisma.userPreferences.create({
        data: {
          id: "default",
          currency: "IDR",
          timezone: "Asia/Jakarta",
        },
      });
      return apiResponse(created);
    }

    return apiResponse(prefs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  await connection();
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError("Request body is required", 400);
    }

    const { currency, timezone } = body;

    const prefs = await prisma.userPreferences.upsert({
      where: { id: "default" },
      update: {
        currency: currency ?? undefined,
        timezone: timezone ?? undefined,
      },
      create: {
        id: "default",
        currency: currency ?? "IDR",
        timezone: timezone ?? "Asia/Jakarta",
      },
    });

    return apiResponse(prefs);
  } catch (error) {
    return handleApiError(error);
  }
}