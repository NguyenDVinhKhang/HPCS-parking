"""
bridge/config.py
Nạp cấu hình từ bridge_config.json + override bằng CLI args.
Đây là file duy nhất biết về cấu trúc file config.
"""

from __future__ import annotations
import json
import os
from dataclasses import dataclass, field
from pathlib import Path

# Tìm bridge_config.json ở thư mục cha của package (backend/)
_DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "bridge_config.json"


@dataclass
class BridgeConfig:
    serial_port: str         = "COM9"
    baud_rate: int           = 115200
    api_url: str             = "http://localhost:8000/api/gate"
    api_timeout_s: int       = 8
    api_retry_count: int     = 2
    default_gate_mode: str   = "IN"   # "IN" | "OUT"
    ping_interval_s: int     = 30
    reconnect_delay_s: int   = 5
    log_level: str           = "INFO"
    log_to_file: bool        = True

    @classmethod
    def from_file(cls, path: Path = _DEFAULT_CONFIG_PATH) -> "BridgeConfig":
        """Nạp config từ JSON. Thiếu key nào thì dùng default."""
        if not path.exists():
            print(f"[CONFIG] Không tìm thấy {path}, dùng cấu hình mặc định.")
            return cls()
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def apply_cli_overrides(self, port: str | None, mode: str | None) -> "BridgeConfig":
        """Override config bằng CLI args (nếu có)."""
        if port:
            self.serial_port = port
        if mode:
            self.default_gate_mode = mode.upper()
        return self

    def summary(self) -> str:
        return (
            f"  Port       : {self.serial_port}\n"
            f"  Baud       : {self.baud_rate}\n"
            f"  API URL    : {self.api_url}\n"
            f"  Gate Mode  : {self.default_gate_mode}\n"
            f"  Ping (s)   : {self.ping_interval_s}\n"
            f"  Log to file: {self.log_to_file}"
        )
