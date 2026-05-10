import { NextResponse } from "next/server";
import { getPaymentByInvoice } from "@/lib/payments";
import { runPaymentSync } from "@/lib/payment-sync";

type ReconcileRequestBody = {
  invoiceNumber?: string;
};

/**
 * POST /api/payments/reconcile
 * Trigger sync XGate và trả về trạng thái mới nhất của 1 invoice.
 * Dùng cho trang /payment để quét giao dịch và hiển thị kết quả thành công ngay.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReconcileRequestBody;
    const invoiceNumber = body.invoiceNumber?.trim();

    if (!invoiceNumber) {
      return NextResponse.json(
        { message: "Thiếu invoiceNumber" },
        { status: 400 },
      );
    }

    const syncSummary = await runPaymentSync({ source: "manual" });
    const payment = await getPaymentByInvoice(invoiceNumber);

    if (!payment) {
      return NextResponse.json(
        { message: "Không tìm thấy payment theo invoice" },
        { status: 404 },
      );
    }

    const allowPass = payment.status === "paid";

    return NextResponse.json({
      data: {
        invoiceNumber,
        allowPass,
        status: payment.status,
        syncSummary,
      },
      message: allowPass ? "Đã thanh toán thành công" : syncSummary.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Đối soát payment thất bại",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
