import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, Search } from "lucide-react";

export default function HistoryPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">
          Lịch sử ra/vào
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xem lịch sử xe ra vào bãi đỗ
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm biển số..." className="pl-9" />
        </div>
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Loại sự kiện" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="in">Xe vào</SelectItem>
            <SelectItem value="out">Xe ra</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="mb-6" />

      {/* Empty State */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Chưa có lịch sử</CardTitle>
          <CardDescription>
            Lịch sử ra vào sẽ được ghi nhận tự động khi hệ thống hoạt động.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant="secondary">Trống</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
