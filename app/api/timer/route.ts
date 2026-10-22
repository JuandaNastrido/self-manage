import { connection } from "next/server";
import { apiResponse, apiError, handleApiError } from "@/lib/utils/api-helpers";
import { TimerService } from "@/lib/services/timer";

export async function GET() {
  await connection();
  try {
    // Check for stale timer and auto-stop if needed
    await TimerService.checkStaleTimer();

    const state = await TimerService.getTimerState();
    return apiResponse(state);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  await connection();
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.action) {
      return apiError('{"action": "start"|"pause"|"resume"|"stop"} diperlukan', 400);
    }

    const { action, taskId } = body as {
      action: "start" | "pause" | "resume" | "stop";
      taskId?: string | null;
    };

    if (action === "start") {
      if (!taskId) {
        return apiError("taskId diperlukan untuk memulai timer", 400);
      }
      const timer = await TimerService.startTimer(taskId);
      return apiResponse(timer, 200);
    }

    if (action === "pause") {
      const timer = await TimerService.pauseTimer();
      return apiResponse(timer);
    }

    if (action === "resume") {
      const timer = await TimerService.resumeTimer();
      return apiResponse(timer);
    }

    if (action === "stop") {
      const result = await TimerService.stopTimer();
      return apiResponse({
        timeEntry: result.timeEntry,
        elapsedSeconds: result.elapsedSeconds,
      });
    }

    return apiError(`Action "${action}" tidak dikenali`, 400);
  } catch (error) {
    if (typeof error === "string" && error.includes("already running")) {
      return apiError(error, 409);
    }
    return handleApiError(error);
  }
}

export async function DELETE() {
  await connection();
  try {
    await TimerService.clearTimer();
    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}