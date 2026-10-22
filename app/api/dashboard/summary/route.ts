import { connection } from "next/server";
import { apiResponse, handleApiError } from "@/lib/utils/api-helpers";
import { DashboardService } from "@/lib/services/dashboard";

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()));

    const summary = await DashboardService.getDashboardData(year, month);

    return apiResponse(summary);
  } catch (error) {
    return handleApiError(error);
  }
}