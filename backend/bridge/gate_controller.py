"""
bridge/gate_controller.py
Logic chính: nhận line từ Serial → gọi API → gửi lệnh lại ESP32.
Không biết về cấu trúc API (đã bọc trong ApiAdapter).
Không biết về chi tiết serial (đã bọc trong SerialManager).
"""

from __future__ import annotations
import logging
import time

from .api_adapter  import ApiAdapter
from .serial_manager import SerialManager
from .config       import BridgeConfig

log = logging.getLogger("bridge.controller")


class GateController:
    def __init__(self, serial: SerialManager, api: ApiAdapter, config: BridgeConfig):
        self._serial  = serial
        self._api     = api
        self._config  = config
        self._last_ping_time = 0.0

    # ──────────────────────────────────────────────────────────────
    #  Khởi động: đồng bộ trạng thái ESP32
    # ──────────────────────────────────────────────────────────────

    def startup_sync(self) -> None:
        """
        Gửi các lệnh cấu hình ban đầu cho ESP32 sau khi kết nối Serial.
        Đảm bảo ESP32 ở đúng chế độ trước khi nhận thẻ thật.
        """
        log.info("=== Startup sync ===")
        time.sleep(1.5)  # chờ ESP32 boot xong (in banner, sẵn sàng)

        # 1. Tắt test mode — bắt buộc để ESP32 gửi UID về bridge thay vì tự xử lý
        self._serial.send("TEST:OFF")
        log.info("→ TEST:OFF")
        time.sleep(0.3)

        # 2. Đặt chế độ cổng theo config
        mode_cmd = f"MODE:{self._config.default_gate_mode}"
        self._serial.send(mode_cmd)
        log.info("→ %s", mode_cmd)
        time.sleep(0.3)

        # 3. Gửi PING để xác nhận ESP32 đang lắng nghe
        self._serial.send("PING")
        log.info("→ PING (chờ PONG...)")
        self._last_ping_time = time.time()

        # Đọc vài dòng phản hồi từ startup
        deadline = time.time() + 5
        pong_received = False
        while time.time() < deadline:
            line = self._serial.readline()
            if line:
                log.info("← %s", line)
                if line == "PONG":
                    pong_received = True
                    break
            time.sleep(0.1)

        if pong_received:
            log.info("=== ESP32 sẵn sàng (PONG nhận được) ===")
        else:
            log.warning("=== Không nhận PONG — ESP32 có thể đang khởi động, tiếp tục... ===")

    # ──────────────────────────────────────────────────────────────
    #  Vòng lặp chính
    # ──────────────────────────────────────────────────────────────

    def run(self) -> None:
        """Vòng lặp chính — đọc serial, xử lý, gửi phản hồi."""
        log.info("Bridge đang chạy. Nhấn Ctrl+C để thoát.")
        try:
            while True:
                # Kiểm tra kết nối Serial
                if not self._serial.ensure_connected():
                    time.sleep(1)
                    continue

                # Đọc 1 dòng từ ESP32
                line = self._serial.readline()
                if line:
                    self._handle_line(line)

                # Heartbeat PING định kỳ
                self._maybe_ping()

                time.sleep(0.05)  # ~20 Hz

        except KeyboardInterrupt:
            log.info("Ctrl+C nhận được — đang thoát...")

    # ──────────────────────────────────────────────────────────────
    #  Xử lý từng dòng từ ESP32
    # ──────────────────────────────────────────────────────────────

    def _handle_line(self, line: str) -> None:
        """Parse line từ ESP32 và hành động tương ứng."""

        # ── Thẻ vào ──────────────────────────────────────────────
        if line.startswith("IN:"):
            uid = line[3:].strip()
            log.info("[CARD IN] UID=%s", uid)
            decision = self._api.handle_entry(uid)
            self._serial.send(decision.open_command)
            log.info("[→ ESP32] %s (%s)", decision.open_command, decision.message)
            if decision.needs_qr:
                log.warning("[QR NEEDED] Session=%s — Hiển thị QR trên UI.", decision.session_id)

        # ── Thẻ ra ───────────────────────────────────────────────
        elif line.startswith("OUT:"):
            uid = line[4:].strip()
            log.info("[CARD OUT] UID=%s", uid)
            decision = self._api.handle_exit(uid)
            self._serial.send(decision.open_command)
            log.info("[→ ESP32] %s (%s)", decision.open_command, decision.message)
            if decision.needs_qr:
                log.warning("[QR NEEDED] Session=%s — Yêu cầu khách quét QR để thanh toán.", decision.session_id)

        # ── Heartbeat phản hồi ───────────────────────────────────
        elif line == "PONG":
            log.debug("PONG nhận được.")

        # ── Trạng thái barrier ───────────────────────────────────
        elif line.startswith("STATUS:"):
            log.info("[STATUS] %s", line[7:])

        # ── Cảm biến IR ──────────────────────────────────────────
        elif line.startswith("IR:"):
            log.info("[IR] %s", line[3:])

        # ── Xác nhận chế độ ─────────────────────────────────────
        elif line.startswith("GATE_MODE:") or line.startswith("TEST_MODE:"):
            log.info("[SYNC] %s", line)

        # ── Sẵn sàng ────────────────────────────────────────────
        elif "HPCS_READY" in line:
            log.info("[BOOT] ESP32 khởi động xong.")

        # ── Khác (log nhưng không xử lý) ─────────────────────────
        else:
            log.debug("[SKIP] %s", line)

    # ──────────────────────────────────────────────────────────────
    #  Heartbeat
    # ──────────────────────────────────────────────────────────────

    def _maybe_ping(self) -> None:
        """Gửi PING mỗi ping_interval_s giây để kiểm tra ESP32 còn sống."""
        now = time.time()
        if now - self._last_ping_time >= self._config.ping_interval_s:
            self._serial.send("PING")
            self._last_ping_time = now
