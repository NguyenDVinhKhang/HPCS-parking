"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ParkingSquare } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (res?.error) {
        setError("Sai tài khoản hoặc mật khẩu");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Đã xảy ra lỗi, vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col space-y-2 text-center lg:text-left">
        <div className="flex lg:hidden justify-center mb-4">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            <ParkingSquare className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-3xl font-heading font-semibold tracking-tight">Chào mừng quay lại</h1>
        <p className="text-sm text-muted-foreground">
          Vui lòng đăng nhập bằng tài khoản nội bộ của bạn
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Tài khoản</Label>
            <Input 
              id="username" 
              type="text" 
              placeholder="Nhập tên đăng nhập" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 transition-all focus-within:ring-2 focus-within:ring-zinc-950 dark:focus-within:ring-white"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 transition-all focus-within:ring-2 focus-within:ring-zinc-950 dark:focus-within:ring-white"
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
          {loading ? "Đang xác thực..." : "Đăng nhập"}
        </Button>
      </form>
    </div>
  );
}
