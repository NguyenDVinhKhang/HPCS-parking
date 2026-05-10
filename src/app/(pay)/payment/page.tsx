"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Copy, QrCode, RefreshCcw } from "lucide-react";

type VehicleType = "car" | "motorcycle" | "truck";
type PaymentMethod = "bank_transfer" | "cash" | "card";

type PaymentQrData = {
  provider: "vietqr";
  qrImageUrl: string;
  bankCode: string;
  accountNumber: string;
  accountName: string | null;
  transferContent: string;
  amount: number;
  currency: string;
};

type ParkingRate = {
  id: number;
  vehicleType: VehicleType;
  unitPrice: number;
  isActive: boolean;
  updatedAt: string;
};

type PaymentResponse = {
  id: number;
  invoiceNumber: string;
  plateNumber: string | null;
  vehicleType: VehicleType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "paid" | "failed";
  createdAt: string;
  paidAt: string | null;
  syncedAt: string | null;
  paymentQr: PaymentQrData | null;
  paymentQrError: string | null;
};

type PaymentSyncSummary = {
  source: "manual" | "scheduler";
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

type SyncTriggerSource = "manual" | "auto";

const AUTO_SYNC_INITIAL_DELAY_MS = 10_000;
const AUTO_SYNC_INTERVAL_MS = 5_000;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function getVehicleLabel(type: VehicleType): string {
  if (type === "motorcycle") {
    return "Xe máy";
  }

  if (type === "truck") {
    return "Xe tải";
  }

  return "Ô tô";
}

export default function PaymentPage() {
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [parkingRates, setParkingRates] = useState<ParkingRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncStarted, setAutoSyncStarted] = useState(false);
  const [successPopupOpen, setSuccessPopupOpen] = useState(false);
  const [lastSuccessInvoice, setLastSuccessInvoice] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const syncInFlightRef = useRef(false);
  const successPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const autoSyncDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const activeRates = useMemo(
    () => parkingRates.filter((rate) => rate.isActive),
    [parkingRates],
  );

  const selectedRate = useMemo(
    () => activeRates.find((rate) => rate.vehicleType === vehicleType) ?? null,
    [activeRates, vehicleType],
  );

  const hasVisibleQr =
    payment?.paymentMethod === "bank_transfer" && Boolean(payment?.paymentQr);

  const clearAutoSyncTimers = useCallback(() => {
    if (autoSyncDelayTimerRef.current) {
      clearTimeout(autoSyncDelayTimerRef.current);
      autoSyncDelayTimerRef.current = null;
    }

    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
    }
  }, []);

  const clearSuccessPopupTimer = useCallback(() => {
    if (successPopupTimerRef.current) {
      clearTimeout(successPopupTimerRef.current);
      successPopupTimerRef.current = null;
    }
  }, []);

  const showSuccessPopup = useCallback(
    (invoiceNumber: string | null) => {
      if (!invoiceNumber) {
        return;
      }

      setLastSuccessInvoice(invoiceNumber);
      setSuccessPopupOpen(true);
      clearSuccessPopupTimer();

      successPopupTimerRef.current = setTimeout(() => {
        setSuccessPopupOpen(false);
      }, 5000);
    },
    [clearSuccessPopupTimer],
  );

  const loadParkingRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(null);

    try {
      const response = await fetch("/api/parking-rates", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        data?: ParkingRate[];
        message?: string;
      };

      if (!response.ok || !Array.isArray(payload.data)) {
        throw new Error(payload.message ?? "Không thể tải cấu hình giá gửi xe");
      }

      const rates = payload.data;
      setParkingRates(rates);

      setVehicleType((previousVehicleType) => {
        const hasCurrentActive = rates.some(
          (rate) => rate.isActive && rate.vehicleType === previousVehicleType,
        );

        if (hasCurrentActive) {
          return previousVehicleType;
        }

        return (
          rates.find((rate) => rate.isActive)?.vehicleType ??
          previousVehicleType
        );
      });
    } catch (error) {
      setRatesError(
        error instanceof Error
          ? error.message
          : "Không thể tải cấu hình giá gửi xe",
      );
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadParkingRates();
  }, [loadParkingRates]);

  const fetchPaymentByInvoice = useCallback(
    async (invoiceNumber: string): Promise<PaymentResponse | null> => {
      const response = await fetch(
        `/api/payments?invoice_number=${encodeURIComponent(invoiceNumber)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as {
        data?: PaymentResponse | null;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Không thể làm mới trạng thái");
      }

      return payload.data ?? null;
    },
    [],
  );

  const createPendingPayment = async () => {
    if (!selectedRate) {
      setMessage("Chưa có loại xe active hoặc chưa cấu hình giá gửi xe");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plateNumber: plateNumber.trim() || undefined,
          vehicleType: selectedRate.vehicleType,
          amount: selectedRate.unitPrice,
          paymentMethod,
        }),
      });

      const payload = (await response.json()) as {
        data?: PaymentResponse;
        message?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "Không thể tạo payment pending");
      }

      setPayment(payload.data);
      setMessage(payload.message ?? "Tạo payment pending thành công");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tạo payment pending",
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshPaymentStatus = async () => {
    if (!payment?.invoiceNumber) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const latestPayment = await fetchPaymentByInvoice(payment.invoiceNumber);

      if (latestPayment) {
        setPayment(latestPayment);
        setMessage("Đã làm mới trạng thái payment");
      } else {
        setMessage("Không tìm thấy payment");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể làm mới trạng thái",
      );
    } finally {
      setLoading(false);
    }
  };

  const syncPaymentFromXGate = useCallback(
    async (
      options: {
        source?: SyncTriggerSource;
        invoiceNumber?: string;
      } = {},
    ) => {
      const source = options.source ?? "manual";
      const invoiceNumber = options.invoiceNumber ?? payment?.invoiceNumber;

      if (!invoiceNumber) {
        if (source === "manual") {
          setMessage("Hãy tạo payment trước khi quét giao dịch");
        }
        return;
      }

      if (syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;
      setSyncing(true);
      if (source === "manual") {
        setMessage(null);
      }

      try {
        const response = await fetch("/api/payments/reconcile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoiceNumber,
          }),
        });

        const payload = (await response.json()) as {
          data?: {
            invoiceNumber: string;
            allowPass: boolean;
            status: PaymentResponse["status"];
            syncSummary: PaymentSyncSummary;
          };
          message?: string;
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "Đối soát XGate thất bại");
        }

        const latestPayment = await fetchPaymentByInvoice(invoiceNumber);
        if (latestPayment) {
          setPayment(latestPayment);
        }

        if (payload.data.allowPass || payload.data.status === "paid") {
          setMessage("Thanh toán thành công. Xe có thể qua cổng.");
          showSuccessPopup(invoiceNumber);
        } else if (source === "manual") {
          const syncSummary = payload.data.syncSummary;
          const rateLimitNote = syncSummary.skippedByRateLimit
            ? " (đã chạm giới hạn 5 request/phút)"
            : "";
          setMessage(
            `${payload.message ?? syncSummary.message}. Đã quét ${syncSummary.fetchedTransactions} giao dịch.${rateLimitNote}`,
          );
        }
      } catch (error) {
        if (source === "manual") {
          setMessage(
            error instanceof Error ? error.message : "Đối soát XGate thất bại",
          );
        }
      } finally {
        syncInFlightRef.current = false;
        setSyncing(false);
      }
    },
    [fetchPaymentByInvoice, payment?.invoiceNumber, showSuccessPopup],
  );

  useEffect(() => {
    const invoiceNumber = payment?.invoiceNumber;
    const shouldAutoSync =
      Boolean(invoiceNumber) && payment?.status === "pending" && hasVisibleQr;

    if (!shouldAutoSync || !invoiceNumber) {
      setAutoSyncStarted(false);
      clearAutoSyncTimers();
      return;
    }

    setAutoSyncStarted(false);
    clearAutoSyncTimers();

    autoSyncDelayTimerRef.current = setTimeout(() => {
      setAutoSyncStarted(true);
      void syncPaymentFromXGate({ source: "auto", invoiceNumber });

      autoSyncIntervalRef.current = setInterval(() => {
        void syncPaymentFromXGate({ source: "auto", invoiceNumber });
      }, AUTO_SYNC_INTERVAL_MS);
    }, AUTO_SYNC_INITIAL_DELAY_MS);

    return () => {
      setAutoSyncStarted(false);
      clearAutoSyncTimers();
    };
  }, [
    clearAutoSyncTimers,
    hasVisibleQr,
    payment?.invoiceNumber,
    payment?.status,
    syncPaymentFromXGate,
  ]);

  useEffect(() => {
    if (!payment?.invoiceNumber || payment.status !== "paid") {
      return;
    }

    if (lastSuccessInvoice === payment.invoiceNumber) {
      return;
    }

    showSuccessPopup(payment.invoiceNumber);
  }, [
    lastSuccessInvoice,
    payment?.invoiceNumber,
    payment?.status,
    showSuccessPopup,
  ]);

  useEffect(() => {
    return () => {
      clearSuccessPopupTimer();
    };
  }, [clearSuccessPopupTimer]);

  const copyTransferContent = async () => {
    if (!payment?.paymentQr?.transferContent) {
      return;
    }

    try {
      await navigator.clipboard.writeText(payment.paymentQr.transferContent);
      setMessage("Đã copy nội dung chuyển khoản");
    } catch {
      setMessage("Không thể copy nội dung chuyển khoản");
    }
  };

  return (
    <main className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Thanh Toán
            </CardTitle>
            <CardDescription>
              QR thật theo chuẩn VietQR, nội dung chuyển khoản là invoice để hệ
              thống đối soát XGate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ratesError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {ratesError}
              </div>
            )}

            {payment?.paymentMethod === "bank_transfer" &&
              payment.paymentQr && (
                <div className="rounded-xl border bg-white p-4">
                  <Image
                    src={payment.paymentQr.qrImageUrl}
                    alt={`VietQR ${payment.invoiceNumber}`}
                    width={280}
                    height={280}
                    unoptimized
                    className="mx-auto h-[280px] w-[280px] max-w-full object-contain"
                  />
                </div>
              )}

            {payment?.paymentMethod !== "bank_transfer" && (
              <div className="rounded-xl border border-dashed bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                QR chỉ hiển thị với phương thức bank transfer.
              </div>
            )}

            {payment?.paymentMethod === "bank_transfer" &&
              !payment.paymentQr && (
                <div className="rounded-xl border border-dashed bg-background px-4 py-8 text-center text-sm text-destructive">
                  {payment.paymentQrError ?? "Chưa tạo được QR thanh toán"}
                </div>
              )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Nội dung chuyển khoản
              </p>
              <p className="rounded-md border bg-background px-3 py-2 text-sm font-medium">
                {payment?.paymentQr?.transferContent ??
                  payment?.invoiceNumber ??
                  "HPCS-... (sinh sau khi bấm tạo payment)"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Số tiền</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  payment?.amount ?? selectedRate?.unitPrice ?? 0,
                )}
              </p>
            </div>

            {payment?.paymentQr && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Thông tin nhận tiền</p>
                <div className="rounded-lg border bg-background p-3 space-y-1">
                  <p>
                    Ngân hàng:{" "}
                    <span className="font-medium uppercase">
                      {payment.paymentQr.bankCode}
                    </span>
                  </p>
                  <p>
                    Số tài khoản:{" "}
                    <span className="font-medium">
                      {payment.paymentQr.accountNumber}
                    </span>
                  </p>
                  <p>
                    Chủ tài khoản:{" "}
                    <span className="font-medium">
                      {payment.paymentQr.accountName ?? "N/A"}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tạo payment pending</CardTitle>
            <CardDescription>
              Chủ động tạo payment để test luồng đồng bộ XGate (invoice_number
              nằm trong content giao dịch).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Biển số (tuỳ chọn)
              </p>
              <Input
                placeholder="Ví dụ: 30A-123.45"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Loại xe</p>
                <Select
                  value={vehicleType}
                  onValueChange={(value) =>
                    setVehicleType(value as VehicleType)
                  }
                  disabled={ratesLoading || activeRates.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn loại xe" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.vehicleType}>
                        {getVehicleLabel(rate.vehicleType)} -{" "}
                        {formatCurrency(rate.unitPrice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedRate
                    ? `Giá hiện hành: ${formatCurrency(selectedRate.unitPrice)} (cập nhật ${new Date(selectedRate.updatedAt).toLocaleString("vi-VN")})`
                    : ratesLoading
                      ? "Đang tải bảng giá từ hệ thống..."
                      : "Chưa có loại xe active trong bảng giá"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Phương thức</p>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setPaymentMethod(value as PaymentMethod)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn phương thức" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={createPendingPayment}
                disabled={loading || ratesLoading || !selectedRate}
              >
                {loading ? "Đang tạo..." : "Tạo payment"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void loadParkingRates()}
                disabled={ratesLoading}
              >
                <RefreshCcw className="h-4 w-4" />
                Tải lại bảng giá
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={copyTransferContent}
                disabled={loading || !payment?.paymentQr?.transferContent}
              >
                <Copy className="h-4 w-4" />
                Copy nội dung CK
              </Button>
              <Button
                className="gap-2"
                onClick={() => void syncPaymentFromXGate({ source: "manual" })}
                disabled={syncing || !payment?.invoiceNumber}
              >
                <RefreshCcw
                  className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Đang quét XGate..." : "Quét giao dịch XGate"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={refreshPaymentStatus}
                disabled={loading || !payment}
              >
                <RefreshCcw className="h-4 w-4" />
                Làm mới trạng thái
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Giới hạn gói XGate: tối đa 5 request/phút, tối đa 50 giao
              dịch/trang.
            </p>

            {payment?.status === "pending" && hasVisibleQr && (
              <p className="text-xs text-amber-700">
                {autoSyncStarted
                  ? "Đang tự động quét XGate mỗi 5 giây."
                  : "QR đã hiển thị. Hệ thống sẽ tự động quét XGate sau 10 giây."}
              </p>
            )}

            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}

            {payment && (
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">{payment.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <Badge
                    variant={
                      payment.status === "paid"
                        ? "default"
                        : payment.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tạo lúc</span>
                  <span>
                    {new Date(payment.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Synced lúc</span>
                  <span>
                    {payment.syncedAt
                      ? new Date(payment.syncedAt).toLocaleString("vi-VN")
                      : "Chưa sync"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={successPopupOpen}
        onOpenChange={(open) => {
          setSuccessPopupOpen(open);
          if (!open) {
            clearSuccessPopupTimer();
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6 animate-in zoom-in-50 duration-300" />
            </AlertDialogMedia>
            <AlertDialogTitle>Thanh toán thành công</AlertDialogTitle>
            <AlertDialogDescription>
              Xe có thể qua cổng.
              {payment?.invoiceNumber
                ? ` Invoice: ${payment.invoiceNumber}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Đã hiểu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
