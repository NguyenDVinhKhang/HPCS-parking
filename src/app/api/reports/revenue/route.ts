import { NextResponse } from "next/server";
import { getRevenueStatsByRange } from "@/lib/reports";

/**
 * GET /api/reports/revenue?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 * Trả về dữ liệu thống kê doanh thu theo khoảng thời gian.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("date_from") ?? undefined;
  const dateTo = searchParams.get("date_to") ?? undefined;

  try {
    const data = await getRevenueStatsByRange({ dateFrom, dateTo });

    return NextResponse.json({
      data,
      message: "Lấy dữ liệu thống kê doanh thu thành công",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể tải dữ liệu thống kê doanh thu",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
