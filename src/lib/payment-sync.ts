import { listPendingPayments, markPaymentPaidByInvoice } from "@/lib/payments";
import { fetchXGateTransactions } from "@/lib/xgate";

const XGATE_RATE_LIMIT_PER_MINUTE = 5;
const RATE_WINDOW_MS = 60_000;
const requestTimestamps: number[] = [];

export type PaymentSyncSource = "manual" | "scheduler";

export type PaymentSyncResult = {
  source: PaymentSyncSource;
  startedAt: string;
  finishedAt: string;
  requestedCalls: number;
  fetchedTransactions: number;
  pendingChecked: number;
  matchedInvoices: string[];
  updatedPayments: number;
  skippedByRateLimit: boolean;
  message: string;
};

export type RunPaymentSyncOptions = {
  source?: PaymentSyncSource;
  maxRequests?: number;
};

function pruneOldRequests(now: number): void {
  while (
    requestTimestamps.length > 0 &&
    now - requestTimestamps[0] >= RATE_WINDOW_MS
  ) {
    requestTimestamps.shift();
  }
}

function canCallXGate(now: number): boolean {
  pruneOldRequests(now);
  return requestTimestamps.length < XGATE_RATE_LIMIT_PER_MINUTE;
}

function registerXGateCall(now: number): void {
  requestTimestamps.push(now);
}

function sanitizeInvoiceToken(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function sanitizeTextForMatch(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function resolveMaxRequests(input?: number): number {
  const envValue = Number(process.env.XGATE_MAX_REQUESTS_PER_RUN);
  const requested = Number.isFinite(input) ? Number(input) : envValue;
  const fallback = Number.isFinite(requested) && requested > 0 ? requested : 1;
  return Math.max(1, Math.min(XGATE_RATE_LIMIT_PER_MINUTE, fallback));
}

function resolveAccountFilter(): string | undefined {
  const account = process.env.XGATE_ACCOUNT?.trim();
  return account && account.length > 0 ? account : undefined;
}

export async function runPaymentSync(
  options: RunPaymentSyncOptions = {},
): Promise<PaymentSyncResult> {
  const startedAt = new Date().toISOString();
  const source = options.source ?? "manual";
  const maxRequests = resolveMaxRequests(options.maxRequests);
  const account = resolveAccountFilter();
  const pendingPayments = await listPendingPayments(300);

  if (pendingPayments.length === 0) {
    const finishedAt = new Date().toISOString();
    return {
      source,
      startedAt,
      finishedAt,
      requestedCalls: 0,
      fetchedTransactions: 0,
      pendingChecked: 0,
      matchedInvoices: [],
      updatedPayments: 0,
      skippedByRateLimit: false,
      message: "Không có payment pending cần đối soát",
    };
  }

  const pendingByToken = new Map(
    pendingPayments.map((payment) => [
      sanitizeInvoiceToken(payment.invoiceNumber),
      payment,
    ]),
  );

  const allTransactions: Awaited<
    ReturnType<typeof fetchXGateTransactions>
  >["transactions"] = [];
  let requestedCalls = 0;
  let skippedByRateLimit = false;

  for (let i = 0; i < maxRequests; i += 1) {
    const now = Date.now();

    if (!canCallXGate(now)) {
      skippedByRateLimit = true;
      break;
    }

    registerXGateCall(now);
    requestedCalls += 1;

    const response = await fetchXGateTransactions({
      page: i + 1,
      limit: Number(process.env.XGATE_PAGE_LIMIT) || 50,
      type: (process.env.XGATE_TYPE as "in" | "out" | undefined) ?? "in",
      account,
      sort: "date_desc",
    });

    allTransactions.push(...response.transactions);
  }

  const matched = new Map<
    string,
    {
      referenceCode: string | null;
      content: string;
    }
  >();

  for (const transaction of allTransactions) {
    const normalizedContent = sanitizeTextForMatch(transaction.content || "");

    if (!normalizedContent) {
      continue;
    }

    for (const [invoiceToken, payment] of pendingByToken.entries()) {
      if (normalizedContent.includes(invoiceToken)) {
        if (!matched.has(payment.invoiceNumber)) {
          matched.set(payment.invoiceNumber, {
            referenceCode: transaction.referenceCode,
            content: transaction.content,
          });
        }
      }
    }
  }

  let updatedPayments = 0;
  for (const [invoiceNumber, payload] of matched.entries()) {
    const affectedRows = await markPaymentPaidByInvoice({
      invoiceNumber,
      xgateReference: payload.referenceCode,
      matchedContent: payload.content,
    });

    updatedPayments += affectedRows;
  }

  const finishedAt = new Date().toISOString();
  return {
    source,
    startedAt,
    finishedAt,
    requestedCalls,
    fetchedTransactions: allTransactions.length,
    pendingChecked: pendingPayments.length,
    matchedInvoices: Array.from(matched.keys()),
    updatedPayments,
    skippedByRateLimit,
    message:
      matched.size > 0
        ? `Đối soát hoàn tất, đã khớp ${matched.size} invoice`
        : "Đối soát hoàn tất, chưa tìm thấy invoice khớp",
  };
}
