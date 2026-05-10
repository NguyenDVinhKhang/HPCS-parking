import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý phương tiện",
};

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
