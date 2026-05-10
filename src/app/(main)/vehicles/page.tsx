import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Car, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function VehiclesPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            Quản lý phương tiện
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Danh sách phương tiện đang trong bãi đỗ
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm phương tiện
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Tìm biển số xe..." className="pl-9" />
      </div>

      <Separator className="mb-6" />

      {/* Empty State */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Car className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Chưa có phương tiện</CardTitle>
          <CardDescription>
            Hệ thống chưa ghi nhận phương tiện nào. Dữ liệu sẽ hiển thị khi có
            xe ra/vào bãi hoặc được thêm thủ công.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant="secondary">Đang chờ dữ liệu</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
