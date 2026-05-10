import { NextResponse } from "next/server";
import {
  createPendingPayment,
  getPaymentByInvoice,
  listRecentPayments,
  type PaymentRecord,
  type PaymentMethod,
  type VehicleType,
} from "@/lib/payments";
import { getParkingRates } from "@/lib/reports";
import {
  buildPaymentQrData,
  getPaymentQrSetupError,
  type PaymentQrData,
} from "@/lib/payment-qr";

type PaymentResponse = PaymentRecord & {
  paymentQr: PaymentQrData | null;
  paymentQrError: string | null;
};

function enrichPaymentResponse(payment: PaymentRecord): PaymentResponse {
  const paymentQr = buildPaymentQrData(payment);

  return {
    ...payment,
    paymentQr,
    paymentQrError: paymentQr
      ? null
      : getPaymentQrSetupError(payment.paymentMethod),
  };
}

function clampLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

/**
 * GET /api/payments?limit=20&invoice_number=HPCS-...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceNumber = searchParams.get("invoice_number")?.trim();

  try {
    if (invoiceNumber) {
      const payment = await getPaymentByInvoice(invoiceNumber);
      return NextResponse.json({
        data: payment ? enrichPaymentResponse(payment) : null,
        total: payment ? 1 : 0,
        message: payment ? "Lấy payment thành công" : "Không tìm thấy payment",
      });
    }

    const limit = clampLimit(searchParams.get("limit"));
    const data = await listRecentPayments(limit);

    return NextResponse.json({
      data,
      total: data.length,
      message: "Lấy danh sách payment thành công",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể tải payment",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/payments
 * Body: { plateNumber?, vehicleType?, paymentMethod?, amount? }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      plateNumber?: string;
      vehicleType?: VehicleType;
      paymentMethod?: PaymentMethod;
      amount?: number;
    };

    const vehicleType: VehicleType = body.vehicleType ?? "car";
    const paymentMethod: PaymentMethod = body.paymentMethod ?? "bank_transfer";

    let amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      amount = NaN;
    }

    if (!Number.isFinite(amount)) {
      const rates = await getParkingRates();
      const rate = rates.find(
        (item) => item.vehicleType === vehicleType && item.isActive,
      );
      amount = rate ? rate.unitPrice : 0;
    }

    const data = await createPendingPayment({
      amount,
      plateNumber: body.plateNumber,
      vehicleType,
      paymentMethod,
    });

    return NextResponse.json(
      {
        data: enrichPaymentResponse(data),
        message: "Tạo payment pending thành công",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể tạo payment pending",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
