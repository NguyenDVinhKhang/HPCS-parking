"""
bridge/serial_manager.py
Quản lý kết nối Serial với ESP32: connect, reconnect, read, write.
Không biết gì về API hay logic nghiệp vụ.
"""

from __future__ import annotations
import logging
import time

import serial

log = logging.getLogger("bridge.serial")


class SerialManager:
    def __init__(self, port: str, baud: int, reconnect_delay: int = 5):
        self._port             = port
        self._baud             = baud
        self._reconnect_delay  = reconnect_delay
        self._ser: serial.Serial | None = None

    # ──────────────────────────────────────────────────────────────
    #  Kết nối
    # ──────────────────────────────────────────────────────────────

    def connect(self) -> bool:
        """Thử kết nối 1 lần. Trả về True nếu thành công."""
        try:
            self._ser = serial.Serial(self._port, self._baud, timeout=1)
            log.info("Đã kết nối Serial %s @ %d baud", self._port, self._baud)
            return True
        except serial.SerialException as e:
            log.error("Không thể mở %s: %s", self._port, e)
            self._ser = None
            return False

    def connect_with_retry(self) -> None:
        """Block cho đến khi kết nối thành công (dùng lúc khởi động)."""
        while not self.connect():
            log.info("Thử lại sau %ds...", self._reconnect_delay)
            time.sleep(self._reconnect_delay)

    def ensure_connected(self) -> bool:
        """
        Kiểm tra kết nối còn sống không.
        Nếu mất → thử reconnect 1 lần, trả về True/False.
        Vòng lặp chính gọi hàm này mỗi iteration.
        """
        if self._ser and self._ser.is_open:
            return True

        log.warning("Mất kết nối Serial. Thử reconnect %s...", self._port)
        time.sleep(self._reconnect_delay)
        if self.connect():
            return True

        log.warning("Reconnect thất bại, thử lại vòng sau.")
        return False

    def close(self):
        if self._ser and self._ser.is_open:
            self._ser.close()
            log.info("Đã đóng cổng Serial %s", self._port)

    # ──────────────────────────────────────────────────────────────
    #  Read / Write
    # ──────────────────────────────────────────────────────────────

    def send(self, msg: str) -> bool:
        """Gửi chuỗi msg + newline về ESP32. Trả về False nếu lỗi."""
        if not (self._ser and self._ser.is_open):
            log.warning("send() thất bại: Serial chưa mở.")
            return False
        try:
            self._ser.write((msg + "\n").encode("utf-8"))
            log.debug("[→ ESP32] %s", msg)
            return True
        except serial.SerialException as e:
            log.error("Lỗi write serial: %s", e)
            self._ser = None  # đánh dấu mất kết nối để ensure_connected xử lý
            return False

    def readline(self) -> str | None:
        """
        Đọc 1 dòng từ ESP32 (non-blocking, trả None nếu chưa có data).
        Trả về chuỗi đã strip, hoặc None.
        """
        if not (self._ser and self._ser.is_open):
            return None
        try:
            if self._ser.in_waiting > 0:
                raw = self._ser.readline()
                line = raw.decode("utf-8", errors="replace").strip()
                if line:
                    log.debug("[← ESP32] %s", line)
                    return line
        except serial.SerialException as e:
            log.error("Lỗi read serial: %s", e)
            self._ser = None
        return None

    def is_connected(self) -> bool:
        """Trả về True nếu cổng serial đang mở và sẵn sàng."""
        return bool(self._ser and self._ser.is_open)

    @property
    def port(self) -> str:
        return self._port
