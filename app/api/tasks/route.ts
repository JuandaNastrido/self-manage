import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { createTaskSchema, getTasksQuerySchema } from "@/lib/validators/task";
import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query: Record<string, string | null> = {
      status: searchParams.get("status"),
      priority: searchParams.get("priority"),
      overdue: searchParams.get("overdue"),
      search: searchParams.get("search"),
    };

    const where: Prisma.TaskWhereInput = {};

    // Handle status filter (could be array or single)
    const statusParam = query.status;
    let statusValues: TaskStatus[] = [];
    if (statusParam) {
      const arr = Array.isArray(statusParam) ? statusParam : [statusParam];
      statusValues = arr
        .map((s) => {
          if (s === "TODO") return TaskStatus.TODO;
          if (s === "IN_PROGRESS") return TaskStatus.IN_PROGRESS;
          if (s === "DONE") return TaskStatus.DONE;
          if (s === "ARCHIVED") return TaskStatus.ARCHIVED;
          return null;
        })
        .filter(Boolean) as TaskStatus[];
    }
    if (statusValues.length > 0) {
      where.status = { in: statusValues };
    } else if (statusParam === null || statusParam === "") {
      where.status = { not: TaskStatus.ARCHIVED };
    }

    // Handle priority filter
    if (query.priority) {
      const priorityMap: Record<string, TaskPriority> = {
        LOW: TaskPriority.LOW,
        MEDIUM: TaskPriority.MEDIUM,
        HIGH: TaskPriority.HIGH,
        CRITICAL: TaskPriority.CRITICAL,
      };
      where.priority = { in: [priorityMap[query.priority]].filter(Boolean) };
    }

    // Handle overdue filter
    if (query.overdue === "true") {
      where.dueDate = { lt: new Date() };
    }

    // Handle search
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        taskCategory: true,
        timeEntries: {
          orderBy: { startTime: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Calculate total time spent for each task
    const taskIds = tasks.map((t) => t.id);
    const timeSpentAgg = await prisma.timeEntry.groupBy({
      by: ["taskId"],
      where: { taskId: { in: taskIds } },
      _sum: { durationSeconds: true },
    });

    const timeSpentMap = new Map<string, number>();
    for (const row of timeSpentAgg) {
      timeSpentMap.set(row.taskId!, row._sum.durationSeconds ?? 0);
    }

    const result = tasks.map((task) => ({
      ...task,
      totalTimeSpent: timeSpentMap.get(task.id) ?? 0,
    }));

    return apiResponse(result);
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

    const validated = createTaskSchema.parse(body);

    const task = await prisma.task.create({
      data: {
        title: validated.title,
        description: validated.description ?? null,
        priority: validated.priority ?? TaskPriority.MEDIUM,
        status: validated.status ?? TaskStatus.TODO,
        dueDate: validated.dueDate ?? null,
        plannedDurationMinutes: validated.plannedDurationMinutes ?? null,
        taskCategoryId: validated.taskCategoryId ?? null,
      },
      include: { taskCategory: true },
    });

    return apiResponse(task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
