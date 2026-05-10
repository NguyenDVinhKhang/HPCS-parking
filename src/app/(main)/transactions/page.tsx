"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartNoAxesCombined, Save, SlidersHorizontal } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

type RevenuePageData = {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  timeSeries: Array<{
    date: string;
    revenue: number;
    paymentCount: number;
  }>;
  statusDistribution: Array<{
    status: "pending" | "paid" | "failed";
    count: number;
    amount: number;
  }>;
  trafficSeries: Array<{
    date: string;
    inCount: number;
    outCount: number;
    total: number;
  }>;
  totals: {
    totalRevenue: number;
    averagePaidAmount: number;
    totalPayments: number;
    paidCount: number;
    pendingCount: number;
    failedCount: number;
    totalHistoryEvents: number;
  };
  parkingRates: Array<{
    id: number;
    vehicleType: "car" | "motorcycle" | "truck";
    unitPrice: number;
    isActive: boolean;
    updatedAt: string;
  }>;
};

const statusLabels: Record<"pending" | "paid" | "failed", string> = {
  pending: "Pending",
  paid: "Đã thanh toán",
  failed: "Thất bại",
};

const statusVariants: Record<
  "pending" | "paid" | "failed",
  "default" | "secondary" | "destructive"
> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
};

const revenueChartConfig = {
  revenue: {
    label: "Doanh thu",
    color: "var(--color-chart-1)",
  },
  transactions: {
    label: "Giao dịch",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

function getDefaultDateRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    dateFrom: toDateKey(from),
    dateTo: toDateKey(to),
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function TransactionsPage() {
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [data, setData] = useState<RevenuePageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ratesDraft, setRatesDraft] = useState<RevenuePageData["parkingRates"]>(
    [],
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const response = await fetch(`/api/reports/revenue?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        data?: RevenuePageData;
        message?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "Không thể tải thống kê doanh thu");
      }

      setData(payload.data);
      setRatesDraft(payload.data.parkingRates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải thống kê doanh thu",
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const saveRates = async () => {
    setSavingRates(true);
    setMessage(null);

    try {
      const response = await fetch("/api/parking-rates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rates: ratesDraft.map((rate) => ({
            vehicleType: rate.vehicleType,
            unitPrice: Number(rate.unitPrice),
            isActive: rate.isActive,
          })),
        }),
      });

      const payload = (await response.json()) as {
        data?: RevenuePageData["parkingRates"];
        message?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "Không thể cập nhật giá gửi xe");
      }

      setRatesDraft(payload.data);
      setMessage("Cập nhật giá gửi xe thành công");
      await loadReport();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Không thể cập nhật giá gửi xe",
      );
    } finally {
      setSavingRates(false);
    }
  };

  const chartData = useMemo(
    () =>
      (data?.timeSeries ?? []).map((point) => ({
        date: point.date,
        revenue: point.revenue,
        transactions: point.paymentCount,
      })),
    [data?.timeSeries],
  );

  const totalStatusCount =
    data?.statusDistribution.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            Thống kê doanh thu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Phân tích doanh thu theo thời gian, trạng thái thanh toán và lưu
            lượng giao dịch.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Bộ lọc khoảng ngày
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Từ ngày</p>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Đến ngày</p>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button onClick={() => void loadReport()} disabled={loading}>
            {loading ? "Đang tải..." : "Áp dụng"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Tổng doanh thu kỳ chọn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totals.totalRevenue ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Số payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totals.totalPayments ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Giá trị trung bình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totals.averagePaidAmount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Lưu lượng history
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totals.totalHistoryEvents ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartNoAxesCombined className="h-4 w-4" />
              Doanh thu theo ngày
            </CardTitle>
            <CardDescription>
              Biểu đồ đường theo doanh thu và số giao dịch đã thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground">
                Đang tải dữ liệu biểu đồ...
              </p>
            )}
            {!loading && (data?.timeSeries.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                Chưa có dữ liệu trong kỳ đã chọn
              </p>
            )}

            {(data?.timeSeries.length ?? 0) > 0 && (
              <ChartContainer
                config={revenueChartConfig}
                className="h-64 w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={(value: string) =>
                      value.slice(5).replace("-", "/")
                    }
                  />
                  <YAxis
                    yAxisId="revenue"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={72}
                    tickFormatter={(value: number) =>
                      formatCompactNumber(value)
                    }
                  />
                  <YAxis
                    yAxisId="transactions"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={40}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(label) => `Ngày ${String(label)}`}
                        formatter={(value, name) => {
                          if (name === "revenue") {
                            return formatCurrency(Number(value));
                          }

                          return `${Number(value)} giao dịch`;
                        }}
                      />
                    }
                  />
                  <Line
                    yAxisId="revenue"
                    dataKey="revenue"
                    type="monotone"
                    stroke="var(--color-revenue)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="transactions"
                    dataKey="transactions"
                    type="monotone"
                    stroke="var(--color-transactions)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bổ theo trạng thái</CardTitle>
            <CardDescription>
              Pending/Paid/Failed trong kỳ đã chọn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.statusDistribution ?? []).map((item) => {
              const ratio =
                totalStatusCount > 0
                  ? (item.count / totalStatusCount) * 100
                  : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={statusVariants[item.status]}>
                      {statusLabels[item.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.count} ({ratio.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div
                      className="h-2 rounded bg-primary"
                      style={{ width: `${Math.max(2, ratio)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              );
            })}
            {(data?.statusDistribution.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                Chưa có phân bổ trạng thái.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Set giá tiền gửi xe</CardTitle>
          <CardDescription>
            Cập nhật trực tiếp bảng parking_rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ratesDraft.map((rate) => (
            <div
              key={rate.vehicleType}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium capitalize">{rate.vehicleType}</p>
                <p className="text-xs text-muted-foreground">
                  Cập nhật: {new Date(rate.updatedAt).toLocaleString("vi-VN")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  value={rate.unitPrice}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setRatesDraft((prev) =>
                      prev.map((item) =>
                        item.vehicleType === rate.vehicleType
                          ? {
                              ...item,
                              unitPrice: Number.isFinite(value) ? value : 0,
                            }
                          : item,
                      ),
                    );
                  }}
                  className="w-36"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rate.isActive}
                    onChange={(e) => {
                      setRatesDraft((prev) =>
                        prev.map((item) =>
                          item.vehicleType === rate.vehicleType
                            ? { ...item, isActive: e.target.checked }
                            : item,
                        ),
                      );
                    }}
                  />
                  Active
                </label>
              </div>
            </div>
          ))}

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : (
              <div />
            )}
            <Button
              className="gap-2"
              onClick={saveRates}
              disabled={savingRates}
            >
              <Save className="h-4 w-4" />
              {savingRates ? "Đang lưu..." : "Lưu giá gửi xe"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
