import type { Metadata } from "next";
import localFont from "next/font/local";
import { bootstrapPaymentSyncScheduler } from "@/lib/payment-sync-scheduler";
import "./globals.css";

const montserrat = localFont({
  src: [
    {
      path: "./fonts/Montserrat-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Montserrat-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Montserrat-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Hybrid Parking Control System (HPCS) - Hệ thống quản lý đỗ xe",
    template: "%s | HPCS",
  },
  description:
    "Hệ thống quản lý bãi đỗ xe thông minh với nhận diện biển số tự động",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Tránh side-effect khi chạy build; scheduler chỉ cần ở runtime server.
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    bootstrapPaymentSyncScheduler();
  }

  return (
    <html lang="vi" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
