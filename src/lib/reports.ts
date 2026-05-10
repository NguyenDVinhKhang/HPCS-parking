import { query } from "@/lib/db";
import {
  countPendingPayments,
  getLatestSyncedAt,
  type PaymentStatus,
  type VehicleType,
} from "@/lib/payments";

type NumberLike = number | string | null;

type DateLike = string | Date | null;

type HistoryRow = {
  id: number;
  plate_number: string;
  event_type: "in" | "out";
  camera_id: string | null;
  image_url: string | null;
  event_time: string | Date;
  confidence: number | string;
};

export type HistoryEvent = {
  id: number;
  plateNumber: string;
  eventType: "in" | "out";
  cameraId: string | null;
  imageUrl: string | null;
  eventTime: string;
  confidence: number;
};

export type ParkingRate = {
  id: number;
  vehicleType: VehicleType;
  unitPrice: number;
  isActive: boolean;
  updatedAt: string;
};

export type ParkingRateUpsertInput = {
  vehicleType: VehicleType;
  unitPrice: number;
  isActive?: boolean;
};

export type DashboardSummary = {
  activeVehicles: number;
  todayRevenue: number;
  todayTransactionCount: number;
  pendingPayments: number;
  systemStatus: {
    totalCameras: number;
    onlineCameras: number;
    offlineCameras: number;
    errorCameras: number;
    lastSyncedAt: string | null;
  };
};

export type RevenueTimePoint = {
  date: string;
  revenue: number;
  paymentCount: number;
};

export type RevenueStatusDistribution = {
  status: PaymentStatus;
  count: number;
  amount: number;
};

export type TrafficTimePoint = {
  date: string;
  inCount: number;
  outCount: number;
  total: number;
};

export type RevenueStats = {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  timeSeries: RevenueTimePoint[];
  statusDistribution: RevenueStatusDistribution[];
  trafficSeries: TrafficTimePoint[];
  totals: {
    totalRevenue: number;
    averagePaidAmount: number;
    totalPayments: number;
    paidCount: number;
    pendingCount: number;
    failedCount: number;
    totalHistoryEvents: number;
  };
  parkingRates: ParkingRate[];
};

function toNumber(value: NumberLike): number {
  return Number(value ?? 0);
}

function toIsoString(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function sanitizeLimit(limit: number, min = 1, max = 100): number {
  return Math.max(min, Math.min(max, Number(limit) || min));
}

function isDateString(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDateKey(value: DateLike): string {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return toDateKeyFromDate(value);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return toDateKeyFromDate(parsed);
}

function getDefaultDateRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);

  const dateTo = toDateKeyFromDate(to);
  const dateFrom = toDateKeyFromDate(from);

  return { dateFrom, dateTo };
}

function resolveDateRange(
  dateFrom?: string,
  dateTo?: string,
): { dateFrom: string; dateTo: string } {
  const fallback = getDefaultDateRange();

  if (!isDateString(dateFrom) || !isDateString(dateTo)) {
    return fallback;
  }

  if (dateFrom > dateTo) {
    return { dateFrom: dateTo, dateTo: dateFrom };
  }

  return { dateFrom, dateTo };
}

function mapHistoryRow(row: HistoryRow): HistoryEvent {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    eventType: row.event_type,
    cameraId: row.camera_id,
    imageUrl: row.image_url,
    eventTime: toIsoString(row.event_time) ?? new Date().toISOString(),
    confidence: toNumber(row.confidence),
  };
}

function listDateBuckets(dateFrom: string, dateTo: string): string[] {
  const buckets: string[] = [];
  const cursor = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  while (cursor <= end) {
    buckets.push(toDateKeyFromDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export async function getParkingRates(): Promise<ParkingRate[]> {
  const rows = await query<
    Array<{
      id: number;
      vehicle_type: VehicleType;
      unit_price: NumberLike;
      is_active: number;
      updated_at: string | Date;
    }>
  >(
    `
      SELECT id, vehicle_type, unit_price, is_active, updated_at
      FROM parking_rates
      ORDER BY FIELD(vehicle_type, 'motorcycle', 'car', 'truck')
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    vehicleType: row.vehicle_type,
    unitPrice: toNumber(row.unit_price),
    isActive: row.is_active === 1,
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  }));
}

export async function updateParkingRates(
  rates: ParkingRateUpsertInput[],
): Promise<ParkingRate[]> {
  for (const rate of rates) {
    const unitPrice = Number(rate.unitPrice);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Giá không hợp lệ cho vehicle_type=${rate.vehicleType}`);
    }

    await query(
      `
        INSERT INTO parking_rates (vehicle_type, unit_price, is_active)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          unit_price = VALUES(unit_price),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP
      `,
      [rate.vehicleType, unitPrice, rate.isActive === false ? 0 : 1],
    );
  }

  return getParkingRates();
}

export async function getRecentHistoryEvents(
  limit = 10,
): Promise<HistoryEvent[]> {
  const safeLimit = sanitizeLimit(limit, 1, 50);
  const rows = await query<HistoryRow[]>(
    `
      SELECT
        id,
        plate_number,
        event_type,
        camera_id,
        image_url,
        event_time,
        confidence
      FROM history
      ORDER BY event_time DESC
      LIMIT ${safeLimit}
    `,
  );

  return rows.map(mapHistoryRow);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    activeVehiclesRows,
    todayRevenueRows,
    todayHistoryRows,
    pendingPayments,
    cameraRows,
    lastSyncedAt,
  ] = await Promise.all([
    query<Array<{ total: NumberLike }>>(
      "SELECT COUNT(*) AS total FROM vehicles",
    ),
    query<Array<{ total: NumberLike }>>(
      `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE status = 'paid'
          AND DATE(COALESCE(paid_at, updated_at)) = CURDATE()
      `,
    ),
    query<Array<{ total: NumberLike }>>(
      `
        SELECT COUNT(*) AS total
        FROM history
        WHERE DATE(event_time) = CURDATE()
      `,
    ),
    countPendingPayments(),
    query<
      Array<{
        total_cameras: NumberLike;
        online_cameras: NumberLike;
        offline_cameras: NumberLike;
        error_cameras: NumberLike;
      }>
    >(
      `
        SELECT
          COUNT(*) AS total_cameras,
          SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) AS online_cameras,
          SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) AS offline_cameras,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_cameras
        FROM cameras
      `,
    ),
    getLatestSyncedAt(),
  ]);

  return {
    activeVehicles: toNumber(activeVehiclesRows[0]?.total),
    todayRevenue: toNumber(todayRevenueRows[0]?.total),
    todayTransactionCount: toNumber(todayHistoryRows[0]?.total),
    pendingPayments,
    systemStatus: {
      totalCameras: toNumber(cameraRows[0]?.total_cameras),
      onlineCameras: toNumber(cameraRows[0]?.online_cameras),
      offlineCameras: toNumber(cameraRows[0]?.offline_cameras),
      errorCameras: toNumber(cameraRows[0]?.error_cameras),
      lastSyncedAt,
    },
  };
}

export async function getRevenueStatsByRange(params: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<RevenueStats> {
  const { dateFrom, dateTo } = resolveDateRange(params.dateFrom, params.dateTo);

  const [
    paymentSeriesRows,
    statusRows,
    trafficRows,
    totalsRows,
    historyTotalRows,
    parkingRates,
  ] = await Promise.all([
    query<
      Array<{
        bucket_date: string | Date;
        revenue: NumberLike;
        payment_count: NumberLike;
      }>
    >(
      `
          SELECT
            DATE(COALESCE(paid_at, updated_at)) AS bucket_date,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*) AS payment_count
          FROM payments
          WHERE status = 'paid'
            AND DATE(COALESCE(paid_at, updated_at)) BETWEEN ? AND ?
          GROUP BY bucket_date
          ORDER BY bucket_date ASC
        `,
      [dateFrom, dateTo],
    ),
    query<
      Array<{
        status: PaymentStatus;
        total_count: NumberLike;
        total_amount: NumberLike;
      }>
    >(
      `
          SELECT
            status,
            COUNT(*) AS total_count,
            COALESCE(SUM(amount), 0) AS total_amount
          FROM payments
          WHERE DATE(created_at) BETWEEN ? AND ?
          GROUP BY status
        `,
      [dateFrom, dateTo],
    ),
    query<
      Array<{
        bucket_date: string | Date;
        in_count: NumberLike;
        out_count: NumberLike;
        total: NumberLike;
      }>
    >(
      `
          SELECT
            DATE(event_time) AS bucket_date,
            SUM(CASE WHEN event_type = 'in' THEN 1 ELSE 0 END) AS in_count,
            SUM(CASE WHEN event_type = 'out' THEN 1 ELSE 0 END) AS out_count,
            COUNT(*) AS total
          FROM history
          WHERE DATE(event_time) BETWEEN ? AND ?
          GROUP BY bucket_date
          ORDER BY bucket_date ASC
        `,
      [dateFrom, dateTo],
    ),
    query<
      Array<{
        total_revenue: NumberLike;
        average_paid_amount: NumberLike;
        total_payments: NumberLike;
        paid_count: NumberLike;
        pending_count: NumberLike;
        failed_count: NumberLike;
      }>
    >(
      `
          SELECT
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(AVG(CASE WHEN status = 'paid' THEN amount END), 0) AS average_paid_amount,
            COUNT(*) AS total_payments,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count
          FROM payments
          WHERE DATE(created_at) BETWEEN ? AND ?
        `,
      [dateFrom, dateTo],
    ),
    query<Array<{ total_history_events: NumberLike }>>(
      `
          SELECT COUNT(*) AS total_history_events
          FROM history
          WHERE DATE(event_time) BETWEEN ? AND ?
        `,
      [dateFrom, dateTo],
    ),
    getParkingRates(),
  ]);

  const dateBuckets = listDateBuckets(dateFrom, dateTo);

  const paymentSeriesMap = new Map(
    paymentSeriesRows
      .map((row) => {
        const dateKey = toDateKey(row.bucket_date);

        return [
          dateKey,
          {
            revenue: toNumber(row.revenue),
            paymentCount: toNumber(row.payment_count),
          },
        ] as const;
      })
      .filter(([dateKey]) => dateKey.length > 0),
  );

  const trafficSeriesMap = new Map(
    trafficRows
      .map((row) => {
        const dateKey = toDateKey(row.bucket_date);

        return [
          dateKey,
          {
            inCount: toNumber(row.in_count),
            outCount: toNumber(row.out_count),
            total: toNumber(row.total),
          },
        ] as const;
      })
      .filter(([dateKey]) => dateKey.length > 0),
  );

  const timeSeries: RevenueTimePoint[] = dateBuckets.map((date) => {
    const point = paymentSeriesMap.get(date);

    return {
      date,
      revenue: point?.revenue ?? 0,
      paymentCount: point?.paymentCount ?? 0,
    };
  });

  const trafficSeries: TrafficTimePoint[] = dateBuckets.map((date) => {
    const point = trafficSeriesMap.get(date);

    return {
      date,
      inCount: point?.inCount ?? 0,
      outCount: point?.outCount ?? 0,
      total: point?.total ?? 0,
    };
  });

  const statusDistribution: RevenueStatusDistribution[] = statusRows.map(
    (row) => ({
      status: row.status,
      count: toNumber(row.total_count),
      amount: toNumber(row.total_amount),
    }),
  );

  return {
    range: { dateFrom, dateTo },
    timeSeries,
    statusDistribution,
    trafficSeries,
    totals: {
      totalRevenue: toNumber(totalsRows[0]?.total_revenue),
      averagePaidAmount: toNumber(totalsRows[0]?.average_paid_amount),
      totalPayments: toNumber(totalsRows[0]?.total_payments),
      paidCount: toNumber(totalsRows[0]?.paid_count),
      pendingCount: toNumber(totalsRows[0]?.pending_count),
      failedCount: toNumber(totalsRows[0]?.failed_count),
      totalHistoryEvents: toNumber(historyTotalRows[0]?.total_history_events),
    },
    parkingRates,
  };
}
