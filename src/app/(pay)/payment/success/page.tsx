"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const REDIRECT_SECONDS = 5;
const KIOSK_HOME = "/"; // Đổi thành route màn hình Kiosk mặc định của bạn

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("status");       // "PAID" hoặc "CANCELLED"
  const orderCode = searchParams.get("orderCode"); // session_id của xe
  const cancel = searchParams.get("cancel");       // "true" / "false"

  const isPaid = status === "PAID" && cancel !== "true";
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  // Đếm ngược và tự redirect về màn hình Kiosk
  useEffect(() => {
    if (countdown <= 0) {
      router.replace(KIOSK_HOME);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md w-full">

        {/* Icon lớn */}
        {isPaid ? (
          <div className="rounded-full bg-emerald-500/15 p-8">
            <CheckCircle2 className="h-20 w-20 text-emerald-400" strokeWidth={1.5} />
          </div>
        ) : (
          <div className="rounded-full bg-red-500/15 p-8">
            <XCircle className="h-20 w-20 text-red-400" strokeWidth={1.5} />
          </div>
        )}

        {/* Tiêu đề */}
        <div className="space-y-2">
          <h1 className={`text-3xl font-bold ${isPaid ? "text-emerald-400" : "text-red-400"}`}>
            {isPaid ? "Thanh toán thành công!" : "Thanh toán thất bại"}
          </h1>
          <p className="text-gray-400 text-lg">
            {isPaid
              ? "Barrier đang mở. Chúc bạn lái xe an toàn!"
              : "Vui lòng thử lại hoặc liên hệ bảo vệ để được hỗ trợ."}
          </p>
        </div>

        {/* Thông tin giao dịch */}
        {orderCode && (
          <div className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Mã phiên xe</span>
              <span className="text-white font-medium">#{orderCode}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Phí gửi xe</span>
              <span className="text-white font-medium">4,000 VND</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Trạng thái</span>
              <span className={`font-medium ${isPaid ? "text-emerald-400" : "text-red-400"}`}>
                {isPaid ? "Đã thanh toán" : "Thất bại / Huỷ"}
              </span>
            </div>
          </div>
        )}

        {/* Đếm ngược redirect */}
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Tự động quay về màn hình chính sau <strong className="text-gray-300">{countdown}s</strong></span>
        </div>

      </div>
    </main>
  );
}
