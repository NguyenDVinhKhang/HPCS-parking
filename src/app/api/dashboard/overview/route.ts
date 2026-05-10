import { NextResponse } from "next/server";
import { getDashboardSummary, getRecentHistoryEvents } from "@/lib/reports";

/**
 * GET /api/dashboard/overview
 * Trả về KPI tổng quan, danh sách giao dịch gần nhất và trạng thái hệ thống.
 */
export async function GET() {
  try {
    const [summary, recentTransactions] = await Promise.all([
      getDashboardSummary(),
      getRecentHistoryEvents(10),
    ]);

    return NextResponse.json({
      data: {
        metrics: {
          activeVehicles: summary.activeVehicles,
          todayRevenue: summary.todayRevenue,
          todayTransactionCount: summary.todayTransactionCount,
          pendingPayments: summary.pendingPayments,
        },
        systemStatus: summary.systemStatus,
        recentTransactions,
      },
      message: "Lấy dữ liệu dashboard thành công",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể tải dữ liệu dashboard",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
