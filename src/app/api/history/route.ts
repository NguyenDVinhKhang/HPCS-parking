import { NextResponse } from "next/server";

/**
 * GET /api/history
 * Lấy lịch sử ra/vào
 */
export async function GET() {
  // TODO: Query database with pagination
  return NextResponse.json({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    message: "Chưa có lịch sử",
  });
}

/**
 * POST /api/history
 * Ghi nhận sự kiện ra/vào
 */
export async function POST(request: Request) {
  const body = await request.json();

  // TODO: Validate & insert into database
  return NextResponse.json(
    {
      message: "API chưa được implement",
      received: body,
    },
    { status: 501 }
  );
}
