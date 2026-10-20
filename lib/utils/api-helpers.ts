import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

/**
 * Standard API response wrapper.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export function apiResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    { success: true, data } as ApiResponse<T>,
    { status }
  );
}

export function apiError(
  message: string,
  status: number = 400,
  errors?: Record<string, string[]>
): NextResponse {
  return NextResponse.json(
    { success: false, error: message, errors } as ApiResponse,
    { status }
  );
}

export async function handleApiError(error: unknown): Promise<NextResponse> {
  console.error("API Error:", error);

  if (typeof error === "string") {
    return apiError(error, 400);
  }

  // Zod validation errors
  if (error && typeof error === "object" && "issues" in error) {
    const zodError = error as { issues: Array<{ path: string[]; message: string }> };
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const path = issue.path.join(".") || "general";
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return apiError("Validasi gagal", 400, fieldErrors);
  }

  // Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as {
      code: string;
      meta?: { target?: string[]; cause?: string };
      message?: string;
    };

    if (prismaError.code === "P2002") {
      const target = prismaError.meta?.target?.join(", ") ?? "field";
      return apiError(`Nilai ${target} sudah digunakan`, 409);
    }

    if (prismaError.code === "P2025") {
      return apiError("Data tidak ditemukan", 404);
    }

    if (prismaError.code === "P2003") {
      return apiError("Referensi tidak valid", 400);
    }
  }

  // Custom Error objects
  if (error && typeof error === "object" && "message" in error) {
    return apiError((error as Error).message, 400);
  }

  return apiError("Internal server error", 500);
}

/**
 * Parse JSON body from Request, returning typed data.
 * Throws validation error if body is invalid.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json().catch(() => null);
  if (!body) {
    throw new Error("Request body is required");
  }
  return schema.parse(body);
}
