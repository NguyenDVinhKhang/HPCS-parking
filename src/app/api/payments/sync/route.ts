import { NextResponse } from "next/server";
import { runPaymentSync } from "@/lib/payment-sync";

/**
 * POST /api/payments/sync
 * Trigger đối soát payment pending với giao dịch XGate.
 */
export async function POST() {
  try {
    const data = await runPaymentSync({ source: "manual" });

    return NextResponse.json({
      data,
      message: data.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Đối soát XGate thất bại",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
