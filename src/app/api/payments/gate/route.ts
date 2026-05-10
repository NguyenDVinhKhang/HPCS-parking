import { NextResponse } from "next/server";
import {
  createPendingPayment,
  getPaymentByInvoice,
  type PaymentMethod,
  type PaymentRecord,
  type VehicleType,
} from "@/lib/payments";
import { getParkingRates } from "@/lib/reports";
import {
  buildPaymentQrData,
  getPaymentQrSetupError,
  type PaymentQrData,
} from "@/lib/payment-qr";

type GateAction = "create" | "verify";

type GateRequestBody = {
  action?: GateAction;
  plateNumber?: string;
  vehicleType?: VehicleType;
  paymentMethod?: PaymentMethod;
  amount?: number;
  currency?: string;
  invoiceNumber?: string;
};

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

function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function resolveAmount(
  inputAmount: unknown,
  vehicleType: VehicleType,
): Promise<number> {
  const amount = Number(inputAmount);

  if (Number.isFinite(amount) && amount >= 0) {
    return amount;
  }

  const rates = await getParkingRates();
  const selectedRate = rates.find(
    (item) => item.vehicleType === vehicleType && item.isActive,
  );

  if (!selectedRate) {
    throw new Error(`Chưa cấu hình giá active cho loại xe ${vehicleType}`);
  }

  return selectedRate.unitPrice;
}

/**
 * POST /api/payments/gate
 * Dùng cho team nhận diện biển số gọi theo 2 action:
 * - action=create: tạo payment từ plate_number + vehicle_type
 * - action=verify: kiểm tra invoice đã paid chưa để quyết định cho xe qua
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GateRequestBody;

    if (body.action === "create") {
      const plateNumber = body.plateNumber?.trim();
      const vehicleType = body.vehicleType;
      const paymentMethod: PaymentMethod =
        body.paymentMethod ?? "bank_transfer";

      if (!plateNumber) {
        return NextResponse.json(
          { message: "Thiếu plateNumber" },
          { status: 400 },
        );
      }

      if (!vehicleType) {
        return NextResponse.json(
          { message: "Thiếu vehicleType" },
          { status: 400 },
        );
      }

      const amount = await resolveAmount(body.amount, vehicleType);
      const payment = await createPendingPayment({
        amount,
        plateNumber,
        vehicleType,
        paymentMethod,
        currency: body.currency,
      });

      return NextResponse.json(
        {
          data: {
            action: "create" as const,
            allowPass: payment.status === "paid",
            payment: enrichPaymentResponse(payment),
            nextStep:
              "Hiển thị QR cho người dùng thanh toán, sau đó gọi lại action=verify để quyết định mở cổng",
          },
          message: "Tạo yêu cầu thanh toán cho cổng thành công",
        },
        { status: 201 },
      );
    }

    if (body.action === "verify") {
      const invoiceNumber = body.invoiceNumber?.trim();

      if (!invoiceNumber) {
        return NextResponse.json(
          { message: "Thiếu invoiceNumber" },
          { status: 400 },
        );
      }

      const payment = await getPaymentByInvoice(invoiceNumber);
      if (!payment) {
        return NextResponse.json(
          {
            data: {
              action: "verify" as const,
              allowPass: false,
              payment: null,
              decision: "WAIT_PAYMENT" as const,
            },
            message: "Không tìm thấy payment theo invoice",
          },
          { status: 404 },
        );
      }

      const inputPlate = body.plateNumber?.trim();
      if (inputPlate && payment.plateNumber) {
        const isSamePlate =
          normalizePlate(inputPlate) === normalizePlate(payment.plateNumber);

        if (!isSamePlate) {
          return NextResponse.json(
            {
              data: {
                action: "verify" as const,
                allowPass: false,
                payment: enrichPaymentResponse(payment),
                decision: "WAIT_PAYMENT" as const,
              },
              message: "Biển số không khớp với invoice",
            },
            { status: 400 },
          );
        }
      }

      const allowPass = payment.status === "paid";

      return NextResponse.json({
        data: {
          action: "verify" as const,
          allowPass,
          payment: enrichPaymentResponse(payment),
          decision: allowPass
            ? ("ALLOW_PASS" as const)
            : ("WAIT_PAYMENT" as const),
        },
        message: allowPass
          ? "Đã thanh toán, cho xe qua"
          : "Chưa thanh toán, chưa cho xe qua",
      });
    }

    return NextResponse.json(
      {
        message: "Thiếu action hợp lệ. Dùng action=create hoặc action=verify",
      },
      { status: 400 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isBadRequest =
      errorMessage.startsWith("Thiếu") ||
      errorMessage.startsWith("Chưa cấu hình") ||
      errorMessage.startsWith("Biển số");

    return NextResponse.json(
      {
        message: "Xử lý payment cho cổng thất bại",
        error: errorMessage,
      },
      { status: isBadRequest ? 400 : 500 },
    );
  }
}
