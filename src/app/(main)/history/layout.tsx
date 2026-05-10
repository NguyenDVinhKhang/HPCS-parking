import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch sử ra/vào",
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
