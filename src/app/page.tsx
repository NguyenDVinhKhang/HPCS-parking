"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Car,
  CircleDollarSign,
  History,
  Clock3,
  Camera,
  RefreshCcw,
} from "lucide-react";

type DashboardData = {
  metrics: {
    activeVehicles: number;
    todayRevenue: number;
    todayTransactionCount: number;
    pendingPayments: number;
  };
  systemStatus: {
    totalCameras: number;
    onlineCameras: number;
    offlineCameras: number;
    errorCameras: number;
    lastSyncedAt: string | null;
  };
  recentTransactions: Array<{
    id: number;
    plateNumber: string;
    eventType: "in" | "out";
    cameraId: string | null;
    eventTime: string;
    confidence: number;
  }>;
};

const defaultDashboardData: DashboardData = {
  metrics: {
    activeVehicles: 0,
    todayRevenue: 0,
    todayTransactionCount: 0,
    pendingPayments: 0,
  },
  systemStatus: {
    totalCameras: 0,
    onlineCameras: 0,
    offlineCameras: 0,
    errorCameras: 0,
    lastSyncedAt: null,
  },
  recentTransactions: [],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    hour12: false,
  });
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData>(defaultDashboardData);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/overview", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        data?: DashboardData;
        message?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "Không thể tải dashboard");
      }

      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/payments/sync", {
        method: "POST",
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Đối soát thất bại");
      }

      setSyncMessage(payload.message ?? "Đối soát hoàn tất");
      await loadDashboard();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Đối soát thất bại");
    } finally {
      setSyncing(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        title: "Xe đang gửi",
        value: `${data.metrics.activeVehicles}`,
        description: "phương tiện",
        icon: Car,
      },
      {
        title: "Doanh thu hôm nay",
        value: formatCurrency(data.metrics.todayRevenue),
        description: "đã thanh toán",
        icon: CircleDollarSign,
      },
      {
        title: "Số giao dịch hôm nay",
        value: `${data.metrics.todayTransactionCount}`,
        description: "sự kiện ra/vào",
        icon: History,
      },
      {
        title: "Thanh toán chờ xử lý",
        value: `${data.metrics.pendingPayments}`,
        description: "pending payments",
        icon: Clock3,
      },
    ],
    [data.metrics],
  );

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Tổng quan hệ thống quản lý đỗ xe
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void loadDashboard()}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4" />
              Tải lại
            </Button>
            <Button className="gap-2" onClick={handleSync} disabled={syncing}>
              {syncing ? "Đang sync..." : "Sync XGate"}
            </Button>
          </div>
        </div>

        {error && (
          <Card>
            <CardContent className="pt-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {syncMessage && (
          <Card>
            <CardContent className="pt-4 text-sm">{syncMessage}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Giao dịch gần nhất</CardTitle>
              <CardDescription>Dữ liệu lấy từ bảng history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && (
                <p className="text-sm text-muted-foreground">
                  Đang tải dữ liệu...
                </p>
              )}
              {!loading && data.recentTransactions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chưa có giao dịch gần nhất
                </p>
              )}
              {data.recentTransactions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{item.plateNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Camera: {item.cameraId ?? "N/A"} -{" "}
                      {formatDateTime(item.eventTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.eventType === "in" ? "default" : "secondary"
                      }
                    >
                      {item.eventType === "in" ? "Xe vào" : "Xe ra"}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trạng thái hệ thống</CardTitle>
              <CardDescription>
                Tình trạng camera và đồng bộ thanh toán
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tổng camera</span>
                <span className="font-medium">
                  {data.systemStatus.totalCameras}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Online</span>
                <Badge className="gap-1">
                  <Camera className="h-3 w-3" />
                  {data.systemStatus.onlineCameras}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Offline</span>
                <Badge variant="secondary">
                  {data.systemStatus.offlineCameras}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Error</span>
                <Badge variant="destructive">
                  {data.systemStatus.errorCameras}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Lần sync gần nhất</p>
                <p className="font-medium mt-1">
                  {data.systemStatus.lastSyncedAt
                    ? formatDateTime(data.systemStatus.lastSyncedAt)
                    : "Chưa có dữ liệu sync"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
