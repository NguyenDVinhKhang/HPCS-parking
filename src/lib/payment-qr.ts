import type { PaymentRecord } from "@/lib/payments";

export type PaymentQrData = {
  provider: "vietqr";
  qrImageUrl: string;
  bankCode: string;
  accountNumber: string;
  accountName: string | null;
  transferContent: string;
  amount: number;
  currency: string;
};

type PaymentQrConfig = {
  bankCode: string | null;
  accountNumber: string | null;
  accountName: string | null;
  template: string;
};

function normalizeEnv(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolvePaymentQrConfig(): PaymentQrConfig {
  return {
    bankCode:
      normalizeEnv(process.env.PAYMENT_QR_BANK_CODE)?.toLowerCase() ?? null,
    accountNumber: normalizeEnv(process.env.PAYMENT_QR_ACCOUNT_NUMBER),
    accountName: normalizeEnv(process.env.PAYMENT_QR_ACCOUNT_NAME),
    template: normalizeEnv(process.env.PAYMENT_QR_TEMPLATE) ?? "compact2",
  };
}

export function getPaymentQrSetupError(
  paymentMethod: PaymentRecord["paymentMethod"],
): string | null {
  if (paymentMethod !== "bank_transfer") {
    return null;
  }

  const config = resolvePaymentQrConfig();
  if (!config.bankCode || !config.accountNumber) {
    return "Thiếu cấu hình QR: cần PAYMENT_QR_BANK_CODE và PAYMENT_QR_ACCOUNT_NUMBER";
  }

  return null;
}

export function buildPaymentQrData(
  payment: PaymentRecord,
): PaymentQrData | null {
  if (payment.paymentMethod !== "bank_transfer") {
    return null;
  }

  const config = resolvePaymentQrConfig();
  if (!config.bankCode || !config.accountNumber) {
    return null;
  }

  const amount = Math.max(0, Math.round(Number(payment.amount) || 0));
  const transferContent = payment.invoiceNumber;

  const imageUrl = new URL(
    `https://img.vietqr.io/image/${config.bankCode}-${config.accountNumber}-${config.template}.png`,
  );
  imageUrl.searchParams.set("addInfo", transferContent);

  if (amount > 0) {
    imageUrl.searchParams.set("amount", `${amount}`);
  }

  if (config.accountName) {
    imageUrl.searchParams.set("accountName", config.accountName);
  }

  return {
    provider: "vietqr",
    qrImageUrl: imageUrl.toString(),
    bankCode: config.bankCode,
    accountNumber: config.accountNumber,
    accountName: config.accountName,
    transferContent,
    amount,
    currency: payment.currency,
  };
}
