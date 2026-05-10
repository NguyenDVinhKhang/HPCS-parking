import { NextResponse } from "next/server";

/**
 * GET /api/camera
 * Lấy danh sách camera
 */
export async function GET() {
  // TODO: Query connected cameras
  return NextResponse.json({
    data: [],
    total: 0,
    online: 0,
    offline: 0,
    message: "Chưa có camera được kết nối",
  });
}

/**
 * POST /api/camera
 * Thêm/kết nối camera mới
 */
export async function POST(request: Request) {
  const body = await request.json();

  // TODO: Validate & connect camera
  return NextResponse.json(
    {
      message: "API chưa được implement",
      received: body,
    },
    { status: 501 }
  );
}
