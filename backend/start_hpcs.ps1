<#
.SYNOPSIS
    Khởi động HPCS Backend + Bridge cùng lúc.
    Ctrl+C → dừng uvicorn → tự động kill bridge → giải phóng COM9.

.USAGE
    cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend
    .\start_hpcs.ps1
    .\start_hpcs.ps1 -Port COM9       # đổi cổng
    .\start_hpcs.ps1 -GateMode OUT    # khởi động ở cổng ra
#>

param(
    [string]$Port     = "COM9",
    [string]$GateMode = "IN"
)

$ErrorActionPreference = "Continue"
$backendDir = $PSScriptRoot   # thư mục chứa script này (backend/)

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      HPCS — Khởi động tất cả dịch vụ    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Green
Write-Host "  Bridge   : $Port | Gate=$GateMode" -ForegroundColor Green
Write-Host "  Ctrl+C   : dừng tất cả + giải phóng $Port" -ForegroundColor Yellow
Write-Host ""

# ── Bước 1: Khởi động bridge trong background ────────────────────────────
$bridgeArgs = "-m bridge --port $Port --mode $GateMode"
$bridge = Start-Process python `
    -ArgumentList $bridgeArgs `
    -WorkingDirectory $backendDir `
    -NoNewWindow -PassThru

if ($bridge -and !$bridge.HasExited) {
    Write-Host "[OK] Bridge khởi động (PID: $($bridge.Id))" -ForegroundColor Green
} else {
    Write-Host "[WARN] Bridge không khởi động được — kiểm tra $Port" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2  # chờ bridge connect serial trước

# ── Bước 2: Uvicorn chạy foreground (Ctrl+C sẽ dừng ở đây) ─────────────
Write-Host "[OK] Uvicorn đang khởi động..." -ForegroundColor Green
try {
    Set-Location $backendDir
    uvicorn main:app --reload --port 8000
}
finally {
    # ── Bước 3: Cleanup khi uvicorn dừng (Ctrl+C hoặc crash) ────────────
    Write-Host ""
    Write-Host "Uvicorn đã dừng — đang dọn dẹp..." -ForegroundColor Yellow

    if ($bridge -and !$bridge.HasExited) {
        Write-Host "  Đang tắt Bridge (PID: $($bridge.Id))..." -ForegroundColor Yellow
        $bridge.Kill()
        $bridge.WaitForExit(3000) | Out-Null
        Write-Host "  [OK] Bridge đã tắt — $Port đã được giải phóng." -ForegroundColor Green
    } else {
        Write-Host "  Bridge đã tắt trước đó." -ForegroundColor Gray
    }

    Write-Host "Tất cả dịch vụ HPCS đã dừng." -ForegroundColor Cyan
}
