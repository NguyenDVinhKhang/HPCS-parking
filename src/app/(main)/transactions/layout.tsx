import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thống kê doanh thu",
};

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
