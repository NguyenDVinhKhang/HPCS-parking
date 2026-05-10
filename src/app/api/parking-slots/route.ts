import { NextResponse } from "next/server";

/**
 * GET /api/parking-slots
 * Lấy danh sách chỗ đỗ
 */
export async function GET() {
  // TODO: Query database
  return NextResponse.json({
    data: [],
    total: 0,
    available: 0,
    occupied: 0,
    message: "Chưa cấu hình bãi đỗ",
  });
}

/**
 * POST /api/parking-slots
 * Thêm/cấu hình chỗ đỗ
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
