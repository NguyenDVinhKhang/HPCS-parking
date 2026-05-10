import { NextResponse } from "next/server";
import {
  getParkingRates,
  updateParkingRates,
  type ParkingRateUpsertInput,
} from "@/lib/reports";

/**
 * GET /api/parking-rates
 */
export async function GET() {
  try {
    const data = await getParkingRates();
    return NextResponse.json({
      data,
      total: data.length,
      message: "Lấy giá gửi xe thành công",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể tải giá gửi xe",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/parking-rates
 * Body: { rates: [{ vehicleType, unitPrice, isActive? }] }
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      rates?: ParkingRateUpsertInput[];
    };

    if (!Array.isArray(body?.rates) || body.rates.length === 0) {
      return NextResponse.json(
        { message: "Thiếu danh sách rates hợp lệ" },
        { status: 400 },
      );
    }

    const data = await updateParkingRates(body.rates);

    return NextResponse.json({
      data,
      total: data.length,
      message: "Cập nhật giá gửi xe thành công",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể cập nhật giá gửi xe",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
