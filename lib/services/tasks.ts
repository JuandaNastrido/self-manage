/**
 * Task service — manages tasks with priorities, statuses, due dates, and time tracking links.
 */
import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { CreateTaskInput, UpdateTaskInput, GetTasksQuery } from "../validators/task";

export class TaskService {
  /**
   * Create a new task.
   */
  static async create(input: CreateTaskInput) {
    return prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? TaskPriority.MEDIUM,
        status: input.status ?? TaskStatus.TODO,
        dueDate: input.dueDate ?? null,
        plannedDurationMinutes: input.plannedDurationMinutes ?? null,
        taskCategoryId: input.taskCategoryId ?? null,
      },
      include: { taskCategory: true },
    });
  }

  /**
   * Get a single task by ID.
   */
  static async getById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        taskCategory: true,
        timeEntries: {
          orderBy: { startTime: "desc" },
        },
      },
    });
  }

  /**
   * Get all tasks with optional filtering.
   */
  static async list(query?: GetTasksQuery) {
    const where: Prisma.TaskWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }
    if (query?.priority) {
      where.priority = query.priority;
    }
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    // Handle overdue filter
    if (query?.overdue) {
      where.dueDate = {
        lt: new Date(),
      };
      where.status = { not: TaskStatus.DONE };
    }

    return prisma.task.findMany({
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
  }

  /**
   * Update an existing task.
   */
  static async update(id: string, input: UpdateTaskInput) {
    const { id: _, ...data } = input;

    // Auto-set completedAt when status changes to DONE
    let completedAt: Date | null | undefined = undefined;
    const newStatus = data.status ?? undefined;
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

    return prisma.task.update({
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
  }

  /**
   * Delete a task and its time entries.
   */
  static async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.timerState.deleteMany({ where: { taskId: id } });
      await tx.timeEntry.deleteMany({ where: { taskId: id } });
      return tx.task.delete({ where: { id } });
    });
  }

  /**
   * Get total time spent on a task (sum of completed time entries).
   */
  static async getTotalTimeSpent(taskId: string): Promise<number> {
    const result = await prisma.timeEntry.aggregate({
      where: { taskId },
      _sum: {
        durationSeconds: true,
      },
    });
    return result._sum.durationSeconds ?? 0;
  }

  /**
   * Get tasks due this week (for calendar view).
   */
  static async getTasksDueInRange(start: Date, end: Date) {
    return prisma.task.findMany({
      where: {
        dueDate: {
          gte: start,
          lte: end,
        },
        status: { not: TaskStatus.ARCHIVED },
      },
      include: { taskCategory: true },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
  }
}
