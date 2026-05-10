import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giám sát camera",
};

export default function CameraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
