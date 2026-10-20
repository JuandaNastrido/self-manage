import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { TimerService } from "@/lib/services/timer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};
    if (taskId) where.taskId = taskId;

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          select: { id: true, title: true, priority: true, status: true },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return apiResponse(timeEntries);
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

    const { taskId, startTime, endTime, durationSeconds, description } = body;

    if (!startTime || !endTime || !durationSeconds) {
      return apiError("startTime, endTime, dan durationSeconds diperlukan", 400);
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiError("Tanggal tidak valid", 400);
    }
    if (end.getTime() <= start.getTime()) {
      return apiError("endTime harus setelah startTime", 400);
    }
    const duration = end.getTime() - start.getTime();
    const expectedDuration = Math.floor(duration / 1000);

    // Use provided duration or calculate
    const finalDuration = durationSeconds || expectedDuration;

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: taskId ?? null,
        startTime: start,
        endTime: end,
        durationSeconds: finalDuration,
        description: description ?? null,
      },
      include: {
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return apiResponse(entry, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
