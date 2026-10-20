import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators/task";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        taskCategory: true,
        timeEntries: {
          orderBy: { startTime: "desc" },
        },
      },
    });

    if (!task) {
      return apiError("Tugas tidak ditemukan", 404);
    }

    // Calculate total time spent
    const timeAgg = await prisma.timeEntry.aggregate({
      where: { taskId: id },
      _sum: { durationSeconds: true },
    });

    return apiResponse({
      ...task,
      totalTimeSpent: timeAgg._sum.durationSeconds ?? 0,
    });
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

    const validated = updateTaskSchema.parse({ ...body, id });
    const { id: _, ...data } = validated;

    // Auto-set completedAt when status changes to DONE
    let completedAt: Date | null | undefined = undefined;
    const newStatus = data.status;
    if (newStatus === TaskStatus.DONE) {
      const existing = await prisma.task.findUnique({
        where: { id },
        select: { status: true, completedAt: true },
      });
      if (existing?.status !== TaskStatus.DONE) {
        completedAt = new Date();
      }
    } else if (newStatus !== undefined) {
      completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        description: data.description,
        priority: data.priority ?? undefined,
        status: data.status ?? undefined,
        dueDate: data.dueDate ?? undefined,
        plannedDurationMinutes: data.plannedDurationMinutes,
        taskCategoryId: data.taskCategoryId,
        completedAt,
      },
      include: { taskCategory: true },
    });

    return apiResponse(task);
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

    const existing = await prisma.task.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError("Tugas tidak ditemukan", 404);
    }

    await prisma.$transaction([
      prisma.timerState.deleteMany({ where: { taskId: id } }),
      prisma.timeEntry.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
