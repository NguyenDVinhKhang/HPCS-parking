"""
bridge/api_adapter.py
═══════════════════════════════════════════════════════════════════
Layer DUY NHẤT biết về:
  - URL endpoint của backend
  - Cấu trúc request/response của từng API

Nếu backend đổi endpoint, thêm field, hoặc đổi logic →
chỉ cần sửa file này, KHÔNG đụng các file khác.
═══════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
import os
import time
from dataclasses import dataclass

import requests
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger("bridge.api")

# Timeout thích nghi theo camera mode:
# Camera ON (EasyOCR CPU) → OCR mất 3–5s → cần timeout cao hơn
# Camera OFF (DB only)    → < 1s          → timeout 3s là đủ
_CAMERA_ENABLED = os.getenv("CAMERA_ENABLED", "false").lower() == "true"
_DEFAULT_TIMEOUT = 8 if _CAMERA_ENABLED else 3
log.info("[ApiAdapter] CAMERA_ENABLED=%s → HTTP timeout=%ds", _CAMERA_ENABLED, _DEFAULT_TIMEOUT)


@dataclass
class GateDecision:
    """
    Kết quả sau khi gọi API — interface contract giữa api_adapter và gate_controller.
    Nội dung bên trong api_adapter.py có thể thay đổi tự do, miễn GateDecision không đổi.
    """
    allow: bool          # True → mở barrier
    open_command: str    # "OPEN-IN" | "OPEN-OUT" | "DENIED"
    message: str         # Log message mô tả kết quả
    needs_qr: bool       # True → khách vãng lai cần quét QR trước khi ra
    session_id: int | None = None


class ApiAdapter:
    """
    Bọc toàn bộ giao tiếp với FastAPI backend.
    Thay đổi API → sửa class này, không ảnh hưởng GateController.
    """

    def __init__(self, base_url: str, timeout: int = _DEFAULT_TIMEOUT, retry: int = 1):
        # base_url = "http://localhost:8000/api/gate"
        # timeout mặc định: 8s khi CAMERA_ENABLED=true, 3s khi false
        self._entry_url = f"{base_url}/entry"
        self._exit_url  = f"{base_url}/exit"
        self._timeout   = timeout
        self._retry     = retry

    # ──────────────────────────────────────────────────────────────
    #  Public interface (gate_controller chỉ gọi 2 hàm này)
    # ──────────────────────────────────────────────────────────────

    def handle_entry(self, uid: str) -> GateDecision:
        """Gọi POST /api/gate/entry với rfid_code."""
        data = self._post(self._entry_url, {"rfid_code": uid})
        if data is None:
            return GateDecision(False, "DENIED", "Lỗi kết nối tới API", False)

        if data.get("success"):
            msg = data.get("message", "OK")
            log.info("[ENTRY OK] %s — %s", uid, msg)
            return GateDecision(True, "OPEN-IN", msg, False, data.get("session_id"))
        else:
            detail = data.get("detail", "API từ chối")
            log.warning("[ENTRY DENIED] %s — %s", uid, detail)
            return GateDecision(False, "DENIED", detail, False)

    def handle_exit(self, uid: str) -> GateDecision:
        """
        Gọi POST /api/gate/exit với rfid_code.
        GUEST có barrier_open=False → cần quét QR → gửi DENIED về ESP32
        (ESP32 reset trạng thái, nhân viên xử lý QR trên UI).
        """
        data = self._post(self._exit_url, {"rfid_code": uid})
        if data is None:
            return GateDecision(False, "DENIED", "Lỗi kết nối tới API", False)

        if data.get("success"):
            barrier_open = data.get("barrier_open", True)
            msg = data.get("message", "OK")
            needs_qr = not barrier_open

            if barrier_open:
                log.info("[EXIT OK] %s — %s", uid, msg)
                return GateDecision(True, "OPEN-OUT", msg, False, data.get("session_id"))
            else:
                # GUEST: API thành công nhưng cần QR trước khi mở
                log.info("[EXIT QR] %s — %s (cần thanh toán QR)", uid, msg)
                return GateDecision(False, "DENIED", msg, True, data.get("session_id"))
        else:
            detail = data.get("detail", "API từ chối")
            log.warning("[EXIT DENIED] %s — %s", uid, detail)
            return GateDecision(False, "DENIED", detail, False)

    # ──────────────────────────────────────────────────────────────
    #  Internal helpers
    # ──────────────────────────────────────────────────────────────

    def _post(self, url: str, payload: dict) -> dict | None:
        """
        Gửi POST request, retry tối đa self._retry lần.
        Trả về dict response hoặc None nếu thất bại hoàn toàn.
        """
        for attempt in range(1, self._retry + 1):
            try:
                log.debug("POST %s attempt %d/%d payload=%s", url, attempt, self._retry, payload)
                resp = requests.post(url, json=payload, timeout=self._timeout)
                # Kể cả 4xx/5xx đều parse JSON (FastAPI trả detail trong body)
                return resp.json()
            except requests.exceptions.Timeout:
                log.warning("API timeout (attempt %d/%d): %s", attempt, self._retry, url)
            except requests.exceptions.ConnectionError:
                log.warning("API connection error (attempt %d/%d): %s", attempt, self._retry, url)
            except Exception as e:
                log.error("API unexpected error: %s", e)
                return None  # không retry nếu lỗi không xác định

            if attempt < self._retry:
                time.sleep(1)  # chờ 1s trước khi retry

        log.error("API unreachable sau %d lần thử: %s", self._retry, url)
        return None
