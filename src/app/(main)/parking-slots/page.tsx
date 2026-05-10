import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ParkingSquare } from "lucide-react";

export default function ParkingSlotsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">
          Quản lý bãi đỗ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trạng thái các chỗ đỗ trong bãi xe
        </p>
      </div>

      {/* Tổng quan */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Tổng chỗ đỗ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">0</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Đang sử dụng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">0</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Còn trống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">0</span>
          </CardContent>
        </Card>
      </div>

      <Separator className="mb-6" />

      {/* Empty State */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <ParkingSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Chưa cấu hình bãi đỗ</CardTitle>
          <CardDescription>
            Cần thiết lập số lượng và vị trí các chỗ đỗ trong hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant="secondary">Cần cấu hình</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
