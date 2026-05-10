import { ParkingSquare } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 text-white p-10">
        <div className="flex items-center gap-2 text-xl font-bold font-heading">
          <ParkingSquare className="w-7 h-7" />
          HPCS
        </div>
        <div>
          <h1 className="text-4xl font-heading font-semibold tracking-tight leading-tight mb-4">
            Quản lý thông minh,<br />
            vận hành tối ưu.
          </h1>
          <p className="text-zinc-400 max-w-sm text-base">
            Hệ thống quản lý bãi đỗ xe lai cao cấp với công nghệ nhận diện biển số tự động.
          </p>
        </div>
        <div className="text-sm font-medium text-zinc-500">
          &copy; {new Date().getFullYear()} Hybrid Parking Control System
        </div>
      </div>
      <div className="flex items-center justify-center p-8 bg-background">
        {children}
      </div>
    </div>
  );
}
