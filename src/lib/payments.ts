import { query } from "@/lib/db";

export type VehicleType = "car" | "motorcycle" | "truck";
export type PaymentStatus = "pending" | "paid" | "failed";
export type PaymentMethod = "bank_transfer" | "cash" | "card";

type PaymentRow = {
  id: number;
  invoice_number: string;
  plate_number: string | null;
  vehicle_type: VehicleType;
  amount: number | string;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  xgate_reference: string | null;
  matched_content: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  paid_at: string | Date | null;
  synced_at: string | Date | null;
};

export type PaymentRecord = {
  id: number;
  invoiceNumber: string;
  plateNumber: string | null;
  vehicleType: VehicleType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  xgateReference: string | null;
  matchedContent: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  syncedAt: string | null;
};

export type CreatePendingPaymentInput = {
  amount: number;
  vehicleType?: VehicleType;
  plateNumber?: string | null;
  paymentMethod?: PaymentMethod;
  currency?: string;
  invoiceNumber?: string;
};

function toIsoString(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    plateNumber: row.plate_number,
    vehicleType: row.vehicle_type,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    status: row.status,
    xgateReference: row.xgate_reference,
    matchedContent: row.matched_content,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    paidAt: toIsoString(row.paid_at),
    syncedAt: toIsoString(row.synced_at),
  };
}

function sanitizeLimit(limit: number, min = 1, max = 100): number {
  return Math.max(min, Math.min(max, Number(limit) || min));
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `HPCS-${date}-${time}-${random}`;
}

export async function createPendingPayment(
  input: CreatePendingPaymentInput,
): Promise<PaymentRecord> {
  const invoiceNumber = (input.invoiceNumber ?? generateInvoiceNumber()).trim();
  const vehicleType = input.vehicleType ?? "car";
  const plateNumber = input.plateNumber?.trim() || null;
  const paymentMethod = input.paymentMethod ?? "bank_transfer";
  const currency = (input.currency ?? "VND").trim().toUpperCase();
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Số tiền không hợp lệ");
  }

  await query(
    `
      INSERT INTO payments (
        invoice_number,
        plate_number,
        vehicle_type,
        amount,
        currency,
        payment_method,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `,
    [invoiceNumber, plateNumber, vehicleType, amount, currency, paymentMethod],
  );

  const rows = await query<PaymentRow[]>(
    `
      SELECT
        id,
        invoice_number,
        plate_number,
        vehicle_type,
        amount,
        currency,
        payment_method,
        status,
        xgate_reference,
        matched_content,
        created_at,
        updated_at,
        paid_at,
        synced_at
      FROM payments
      WHERE invoice_number = ?
      LIMIT 1
    `,
    [invoiceNumber],
  );

  if (!rows[0]) {
    throw new Error("Không thể tạo payment pending");
  }

  return mapPayment(rows[0]);
}

export async function getPaymentByInvoice(
  invoiceNumber: string,
): Promise<PaymentRecord | null> {
  const rows = await query<PaymentRow[]>(
    `
      SELECT
        id,
        invoice_number,
        plate_number,
        vehicle_type,
        amount,
        currency,
        payment_method,
        status,
        xgate_reference,
        matched_content,
        created_at,
        updated_at,
        paid_at,
        synced_at
      FROM payments
      WHERE invoice_number = ?
      LIMIT 1
    `,
    [invoiceNumber],
  );

  if (!rows[0]) {
    return null;
  }

  return mapPayment(rows[0]);
}

export async function listRecentPayments(limit = 10): Promise<PaymentRecord[]> {
  const safeLimit = sanitizeLimit(limit, 1, 50);
  const rows = await query<PaymentRow[]>(
    `
      SELECT
        id,
        invoice_number,
        plate_number,
        vehicle_type,
        amount,
        currency,
        payment_method,
        status,
        xgate_reference,
        matched_content,
        created_at,
        updated_at,
        paid_at,
        synced_at
      FROM payments
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `,
  );

  return rows.map(mapPayment);
}

export async function listPendingPayments(
  limit = 200,
): Promise<PaymentRecord[]> {
  const safeLimit = sanitizeLimit(limit, 1, 500);
  const rows = await query<PaymentRow[]>(
    `
      SELECT
        id,
        invoice_number,
        plate_number,
        vehicle_type,
        amount,
        currency,
        payment_method,
        status,
        xgate_reference,
        matched_content,
        created_at,
        updated_at,
        paid_at,
        synced_at
      FROM payments
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ${safeLimit}
    `,
  );

  return rows.map(mapPayment);
}

export async function countPendingPayments(): Promise<number> {
  const rows = await query<Array<{ total: number | string }>>(
    "SELECT COUNT(*) AS total FROM payments WHERE status = 'pending'",
  );

  return Number(rows[0]?.total ?? 0);
}

export async function markPaymentPaidByInvoice(options: {
  invoiceNumber: string;
  xgateReference?: string | null;
  matchedContent?: string | null;
}): Promise<number> {
  const result = await query<{ affectedRows?: number }>(
    `
      UPDATE payments
      SET
        status = 'paid',
        xgate_reference = ?,
        matched_content = ?,
        paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
        synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE invoice_number = ?
        AND status = 'pending'
    `,
    [
      options.xgateReference ?? null,
      options.matchedContent ?? null,
      options.invoiceNumber,
    ],
  );

  return Number(result.affectedRows ?? 0);
}

export async function markPaymentSyncedAt(
  invoiceNumber: string,
): Promise<number> {
  const result = await query<{ affectedRows?: number }>(
    `
      UPDATE payments
      SET
        synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE invoice_number = ?
    `,
    [invoiceNumber],
  );

  return Number(result.affectedRows ?? 0);
}

export async function getLatestSyncedAt(): Promise<string | null> {
  const rows = await query<Array<{ last_synced_at: string | Date | null }>>(
    "SELECT MAX(synced_at) AS last_synced_at FROM payments",
  );

  return toIsoString(rows[0]?.last_synced_at ?? null);
}
