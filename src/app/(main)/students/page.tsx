"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, RefreshCcw, Wallet, Plus } from "lucide-react";

type Student = {
  rfid_card_code: string;
  full_name:      string;
  student_code:   string | null;
  balance:        number;
};

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function BalanceBar({ balance }: { balance: number }) {
  // Hiển thị màu theo mức số dư
  const color =
    balance >= 10000 ? "bg-green-500" :
    balance >= 4000  ? "bg-yellow-400" : "bg-red-500";
  const pct = Math.min(100, (balance / 50000) * 100);
  return (
    <div className="w-full h-1.5 bg-muted rounded-full mt-2">
      <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents]     = useState<Student[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [topupRfid, setTopupRfid]   = useState("");
  const [topupAmt, setTopupAmt]     = useState("10000");
  const [topupMsg, setTopupMsg]     = useState<string | null>(null);
  const [topupErr, setTopupErr]     = useState<string | null>(null);
  const [topping, setTopping]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/students");
      const j = await r.json() as { data?: Student[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Lỗi");
      setStudents(j.data ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleTopup = async (rfid?: string) => {
    const targetRfid = rfid ?? topupRfid.trim();
    const amount     = parseInt(topupAmt, 10);
    if (!targetRfid || isNaN(amount) || amount <= 0) {
      setTopupErr("Vui lòng chọn sinh viên và nhập số tiền hợp lệ.");
      return;
    }
    setTopping(true);
    setTopupMsg(null);
    setTopupErr(null);
    try {
      const r = await fetch("/api/students/topup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rfid_code: targetRfid, amount }),
      });
      const j = await r.json() as { message?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Lỗi nạp tiền");
      setTopupMsg(j.message ?? "Nạp tiền thành công!");
      await load();
    } catch (e) {
      setTopupErr(String(e));
    } finally {
      setTopping(false);
    }
  };

  const PRESET_AMOUNTS = [10000, 20000, 50000];

  return (
    <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Sinh viên</h1>
            <p className="mt-1 text-muted-foreground">Quản lý thẻ RFID và số dư tài khoản</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Tải lại
          </Button>
        </div>

        {error && (
          <Card><CardContent className="pt-4 text-sm text-destructive">{error}</CardContent></Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">

          {/* Danh sách sinh viên */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Danh sách ({students.length} sinh viên)
            </h2>
            {loading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
            {!loading && students.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Chưa có sinh viên nào. Chạy <code>schema_v2.sql</code> để seed dữ liệu.
              </p>
            )}
            {students.map((s) => (
              <Card key={s.rfid_card_code} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{s.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        <span>{s.rfid_card_code}</span>
                        {s.student_code && (
                          <Badge variant="outline" className="text-xs">{s.student_code}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${s.balance < 4000 ? "text-destructive" : "text-green-600"}`}>
                        {formatVND(s.balance)}
                      </p>
                      {s.balance < 4000 && (
                        <Badge variant="destructive" className="text-xs mt-1">Không đủ tiền</Badge>
                      )}
                    </div>
                  </div>
                  <BalanceBar balance={s.balance} />
                  {/* Nút nạp nhanh */}
                  <div className="flex gap-2 mt-3">
                    {PRESET_AMOUNTS.map((amt) => (
                      <Button
                        key={amt}
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        disabled={topping}
                        onClick={() => {
                          setTopupRfid(s.rfid_card_code);
                          setTopupAmt(String(amt));
                          void handleTopup(s.rfid_card_code);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {(amt / 1000).toFixed(0)}k
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Panel nạp tiền tùy chỉnh */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4" />
                  Nạp tiền thủ công
                </CardTitle>
                <CardDescription>Nhập RFID và số tiền cần nạp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">RFID thẻ sinh viên</label>
                  <Input
                    placeholder="vd: 698D2B3F"
                    value={topupRfid}
                    onChange={(e) => setTopupRfid(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Số tiền (VND)</label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={topupAmt}
                    onChange={(e) => setTopupAmt(e.target.value)}
                    min={1000}
                    step={1000}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setTopupAmt(String(amt))}
                    >
                      {(amt / 1000).toFixed(0)}k
                    </Button>
                  ))}
                </div>
                <Separator />
                <Button
                  className="w-full gap-2"
                  onClick={() => void handleTopup()}
                  disabled={topping || !topupRfid}
                >
                  <Plus className="h-4 w-4" />
                  {topping ? "Đang nạp..." : "Xác nhận nạp tiền"}
                </Button>
                {topupMsg && (
                  <p className="text-xs text-green-600 font-medium">{topupMsg}</p>
                )}
                {topupErr && (
                  <p className="text-xs text-destructive">{topupErr}</p>
                )}
              </CardContent>
            </Card>

            {/* Hướng dẫn */}
            <Card>
              <CardContent className="pt-4 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Phí gửi xe</p>
                <div className="flex justify-between">
                  <span>Sinh viên</span><span className="font-medium">2,000đ / lượt</span>
                </div>
                <div className="flex justify-between">
                  <span>Khách vãng lai</span><span className="font-medium">4,000đ / lượt</span>
                </div>
                <Separator />
                <p>Số dư tối thiểu để vào bãi: <strong>2,000đ</strong></p>
              </CardContent>
            </Card>
          </div>

        </div>
    </div>
  );
}
