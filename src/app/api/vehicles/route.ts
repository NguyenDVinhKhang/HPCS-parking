import { NextResponse } from "next/server";

/**
 * GET /api/vehicles
 * Lấy danh sách phương tiện
 */
export async function GET() {
  // TODO: Query database
  return NextResponse.json({
    data: [],
    total: 0,
    message: "Chưa có dữ liệu phương tiện",
  });
}

/**
 * POST /api/vehicles
 * Thêm phương tiện mới
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
