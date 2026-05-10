import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý bãi đỗ",
};

export default function ParkingSlotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
