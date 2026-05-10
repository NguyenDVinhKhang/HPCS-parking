"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, ImageOff, Wifi, WifiOff, CameraOff, ScanSearch } from "lucide-react";
import { captureCameraFrame, detectLive, scanPlate } from "@/lib/camera";

// ─── Cấu hình danh sách camera ───────────────────────────────────────────────
const CAMERA_LIST = [
  {
    id: "entry_cam_1",
    label: "Camera 1",
    location: "Cổng 1",
    device: "Aoni Webcam (USB 0)",
    isAvailable: true,
  },
  {
    id: "exit_cam_1",
    label: "Camera 2",
    location: "Cổng 2",
    device: "Chưa kết nối",
    isAvailable: false,
  },
  {
    id: "entry_cam_2",
    label: "Camera 3",
    location: "Cổng 3",
    device: "Chưa kết nối",
    isAvailable: false,
  },
];

type CameraConfig = (typeof CAMERA_LIST)[number];

const STREAM_INTERVAL_MS = 67;    // ~15fps cho live video
const DETECT_INTERVAL_MS = 5000;  // Auto-detect mỗi 5s

// ─── Hook stream video riêng ──────────────────────────────────────────────────
function useCameraStream(active: boolean) {
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setLiveFrame(null);
      return;
    }
    const poll = async () => {
      try {
        const img = await captureCameraFrame();
        setLiveFrame(img);
      } catch { /* bỏ qua lỗi mạng tạm thời */ }
    };
    poll();
    intervalRef.current = setInterval(poll, STREAM_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [active]);

  return liveFrame;
}

// ─── Component camera card ────────────────────────────────────────────────────
function ActiveCameraCard({
  cam,
  onToggleOff,
}: {
  cam: CameraConfig;
  onToggleOff: (id: string) => void;
}) {
  const liveFrame = useCameraStream(true);

  // State cho nhận diện tự động liên tục
  const [liveDetection, setLiveDetection] = useState<{
    plate: string;
    confidence: number;
  } | null>(null);
  // Biển số gần nhất nhận được — hiển thị lại khi không detect được biển mới
  const [lastDetectedPlate, setLastDetectedPlate] = useState<{
    plate: string;
    confidence: number;
  } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const detectingRef = useRef(false);

  // State cho chụp ảnh thủ công (lưu snapshot + biển số xác nhận)
  const [isCapturing, setIsCapturing] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    imageData: string;
    plate: string;
    confidence: number;
  } | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // ── Polling nhận diện tự động: reset mỗi 5s ──────────────────────────────────
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const detect = async () => {
      if (detectingRef.current) return;
      detectingRef.current = true;
      setIsDetecting(true);
      try {
        const result = await detectLive();
        const hasPlate = result.plate_number
          && result.plate_number !== "KHÔNG THẤY BIỂN SỐ"
          && result.confidence > 0.35;

        if (hasPlate) {
          const detection = { plate: result.plate_number, confidence: result.confidence };
          setLiveDetection(detection);
          setLastDetectedPlate(detection); // Cập nhật biển số gần nhất
        } else {
          setLiveDetection(null); // Xóa live, nhưng giữ lastDetectedPlate
        }
      } catch {
        setLiveDetection(null);
      } finally {
        detectingRef.current = false;
        setIsDetecting(false);
      }
      // Reset timer mỗi 5s bất kể có hay không có biển số
      timeoutId = setTimeout(detect, DETECT_INTERVAL_MS);
    };

    timeoutId = setTimeout(detect, 1000); // Bắt đầu sau 1s để camera warm-up
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, []);

  // ── Nút Chụp ảnh: lưu snapshot + chạy OCR chất lượng cao ───────────────
  const handleCapture = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const result = await scanPlate(cam.id);
      setSnapshot({
        imageData: result.image_data,
        plate: result.plate_number,
        confidence: result.confidence,
      });
    } catch (err) {
      console.error("[Capture error]", err);
      setCaptureError("Không thể chụp ảnh. Đang xử lý OCR, hãy thử lại.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Card className="flex flex-col">
      {/* ── Header ── */}
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Camera className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              {cam.label} — {cam.location}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{cam.device}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 text-xs">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Live
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onToggleOff(cam.id)}
          >
            Tắt
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        {/* ── Live feed ── */}
        <div className="relative w-full rounded-lg border bg-slate-950 overflow-hidden flex items-center justify-center min-h-[220px]">
          {liveFrame ? (
            <img src={liveFrame} alt="Live" className="w-full object-contain max-h-[260px]" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500 py-10">
              <ImageOff className="h-8 w-8" />
              <span className="text-xs animate-pulse">Đang kết nối...</span>
            </div>
          )}
        </div>

        {/* ── Detection banner ── */}
        <div className={[
          "rounded-lg border px-3 py-2 flex items-center justify-between gap-2 transition-all duration-300 min-h-[52px]",
          liveDetection
            ? "border-blue-300 bg-blue-50"       // Đang detect trực tiếp
            : lastDetectedPlate
            ? "border-slate-200 bg-slate-50"     // Hiển thị biển số gần nhất
            : "border-dashed border-slate-200 bg-slate-50/50" // Chưa có biển nào
        ].join(" ")}>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ScanSearch className={[
                "h-3.5 w-3.5 shrink-0",
                isDetecting ? "animate-pulse text-blue-400" : liveDetection ? "text-blue-500" : "text-slate-400"
              ].join(" ")} />
              {liveDetection ? (
                <span className="font-mono font-bold text-blue-900 tracking-widest text-base">
                  {liveDetection.plate}
                </span>
              ) : lastDetectedPlate ? (
                <span className="font-mono font-bold text-slate-600 tracking-widest text-base">
                  {lastDetectedPlate.plate}
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  {isDetecting ? "Đang quét..." : "Chưa phát hiện biển số"}
                </span>
              )}
            </div>
            {/* Nhãn trạng thái */}
            <span className="text-[10px] text-slate-400 ml-5.5">
              {liveDetection ? "⬤ Đang nhận diện" : lastDetectedPlate ? "○ Biển số gần nhất" : ""}
            </span>
          </div>
          {(liveDetection || lastDetectedPlate) && (
            <Badge className={[
              "text-[10px] shrink-0",
              liveDetection
                ? "bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-100"
                : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-100"
            ].join(" ")}>
              {((liveDetection?.confidence ?? lastDetectedPlate?.confidence ?? 0) * 100).toFixed(0)}%
            </Badge>
          )}
        </div>

        {/* ── Nút chụp ảnh (lưu xác nhận) ── */}
        <Button
          onClick={handleCapture}
          disabled={isCapturing || !liveFrame || isDetecting}
          size="sm"
          className="gap-2 w-full"
        >
          <Camera className="h-4 w-4" />
          {isCapturing ? "Đang xử lý OCR..." : isDetecting ? "Đang quét tự động..." : "Chụp ảnh"}
        </Button>

        {/* Lỗi capture */}
        {captureError && (
          <p className="text-xs text-red-500 text-center">{captureError}</p>
        )}

        {/* ── Snapshot đã chụp ── */}
        {snapshot && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden">
            <div className="bg-slate-900 flex items-center justify-center max-h-[160px] overflow-hidden">
              <img
                src={snapshot.imageData}
                alt="Snapshot"
                className="w-full object-contain max-h-[160px]"
              />
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] text-emerald-700 font-medium mb-0.5">Biển số xác nhận</p>
                <p className="text-xl font-mono font-bold text-emerald-900 tracking-widest">
                  {snapshot.plate}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shrink-0">
                {(snapshot.confidence * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Trang chính ──────────────────────────────────────────────────────────────
export default function CameraPage() {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());

  const onlineCount = CAMERA_LIST.filter((c) => c.isAvailable).length;
  const offlineCount = CAMERA_LIST.filter((c) => !c.isAvailable).length;

  const toggleCamera = useCallback((cam: CameraConfig) => {
    if (!cam.isAvailable) return;
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(cam.id)) {
        next.delete(cam.id);
      } else {
        next.add(cam.id);
      }
      return next;
    });
  }, []);

  const turnOff = useCallback((id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const activeCameras = CAMERA_LIST.filter((c) => activeIds.has(c.id));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Giám sát camera</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chọn camera để bắt đầu giám sát và nhận diện biển số tự động
          </p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Online</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{onlineCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{offlineCount}</span>
          </CardContent>
        </Card>
      </div>

      <Separator className="mb-6" />

      {/* Camera Selector */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {CAMERA_LIST.map((cam) => {
          const isActive = activeIds.has(cam.id);
          return (
            <button
              key={cam.id}
              onClick={() => toggleCamera(cam)}
              disabled={!cam.isAvailable}
              className={[
                "rounded-xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                cam.isAvailable
                  ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                  : "cursor-not-allowed opacity-40 grayscale",
                isActive
                  ? "border-primary ring-2 ring-primary shadow-md"
                  : "border-border bg-card",
              ].join(" ")}
            >
              <div className="relative h-32 bg-slate-900 rounded-t-xl flex items-center justify-center overflow-hidden">
                {cam.isAvailable ? (
                  <Camera className="h-8 w-8 text-slate-400" />
                ) : (
                  <CameraOff className="h-8 w-8 text-slate-600" />
                )}
                <div className="absolute top-2 right-2">
                  {cam.isAvailable ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/80 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${isActive ? "animate-pulse" : ""}`} />
                      {isActive ? "Đang bật" : "Online"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-400">
                      Offline
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm">{cam.label} — {cam.location}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{cam.device}</p>
                <p className="text-xs mt-1 font-medium text-primary">
                  {isActive ? "Nhấn để tắt" : cam.isAvailable ? "Nhấn để bật" : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active cameras grid */}
      {activeCameras.length > 0 && (
        <div className={[
          "grid gap-4",
          activeCameras.length === 1 ? "grid-cols-1 max-w-2xl" : "sm:grid-cols-2",
        ].join(" ")}>
          {activeCameras.map((cam) => (
            <ActiveCameraCard key={cam.id} cam={cam} onToggleOff={turnOff} />
          ))}
        </div>
      )}
    </div>
  );
}
