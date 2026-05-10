export type XGateFilters = {
  page?: number;
  limit?: number;
  account?: string;
  sender_account?: string;
  receiver_account?: string;
  type?: "in" | "out";
  bank?: string;
  reference_code?: string;
  name?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  content?: string;
  sort?: "date_desc" | "date_asc" | "amount_asc" | "amount_desc";
};

export type XGateTransaction = {
  id: string;
  content: string;
  amount: number;
  referenceCode: string | null;
  transactionDate: string | null;
  raw: Record<string, unknown>;
};

export type XGateResponse = {
  transactions: XGateTransaction[];
  raw: unknown;
};

function getBaseUrl(): string {
  return (
    process.env.XGATE_API_URL?.trim() || "https://xgate.vn/api/v1/transactions"
  );
}

function clampLimit(limit?: number): number {
  const fallback = Number(process.env.XGATE_PAGE_LIMIT) || 50;
  const safeLimit = Number.isFinite(limit) ? Number(limit) : fallback;
  return Math.max(1, Math.min(50, safeLimit));
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function extractTransactions(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item) => typeof item === "object" && item !== null,
    ) as Record<string, unknown>[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const direct = payload as Record<string, unknown>;
  const candidates = [
    direct.data,
    direct.transactions,
    direct.items,
    direct.result,
    direct.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item) => typeof item === "object" && item !== null,
      ) as Record<string, unknown>[];
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.transactions)) {
        return nested.transactions.filter(
          (item) => typeof item === "object" && item !== null,
        ) as Record<string, unknown>[];
      }
      if (Array.isArray(nested.items)) {
        return nested.items.filter(
          (item) => typeof item === "object" && item !== null,
        ) as Record<string, unknown>[];
      }
      if (Array.isArray(nested.data)) {
        return nested.data.filter(
          (item) => typeof item === "object" && item !== null,
        ) as Record<string, unknown>[];
      }
    }
  }

  return [];
}

function normalizeTransaction(
  item: Record<string, unknown>,
  index: number,
): XGateTransaction {
  const content =
    pickString(
      item.content,
      item.description,
      item.transaction_content,
      item.note,
      item.remark,
    ) ?? "";
  const referenceCode = pickString(
    item.reference_code,
    item.referenceCode,
    item.ref,
    item.transaction_ref,
  );
  const transactionDate = pickString(
    item.date,
    item.transaction_date,
    item.created_at,
    item.timestamp,
  );
  const id =
    pickString(
      item.id,
      item.uuid,
      item.transaction_id,
      item.reference_code,
      item.referenceCode,
    ) ?? `xgate-${index}`;

  return {
    id,
    content,
    amount: toNumber(item.amount),
    referenceCode,
    transactionDate,
    raw: item,
  };
}

export async function fetchXGateTransactions(
  filters: XGateFilters = {},
): Promise<XGateResponse> {
  const apiKey = process.env.XGATE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Thiếu biến môi trường XGATE_API_KEY");
  }

  const url = new URL(getBaseUrl());
  const queryEntries: Record<string, string | number | undefined> = {
    page: filters.page ?? 1,
    limit: clampLimit(filters.limit),
    account: filters.account,
    sender_account: filters.sender_account,
    receiver_account: filters.receiver_account,
    type: filters.type,
    bank: filters.bank,
    reference_code: filters.reference_code,
    name: filters.name,
    date_from: filters.date_from,
    date_to: filters.date_to,
    amount_min: filters.amount_min,
    amount_max: filters.amount_max,
    content: filters.content,
    sort: filters.sort,
  };

  for (const [key, value] of Object.entries(queryEntries)) {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      url.searchParams.set(key, `${value}`);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`XGate trả về lỗi ${response.status}`);
  }

  const payload: unknown = await response.json();
  const rawTransactions = extractTransactions(payload);
  const transactions = rawTransactions.map((item, index) =>
    normalizeTransaction(item, index),
  );

  return {
    transactions,
    raw: payload,
  };
}
