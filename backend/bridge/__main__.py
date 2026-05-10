"""
bridge/__main__.py
Entry point: python -m bridge [--port COM9] [--mode OUT] [--config path]

Ví dụ:
  python -m bridge                        # dùng bridge_config.json
  python -m bridge --port COM3            # override port
  python -m bridge --port COM3 --mode OUT # cổng ra
"""

import argparse
import logging
import sys
from pathlib import Path

from .config          import BridgeConfig
from .api_adapter     import ApiAdapter
from .serial_manager  import SerialManager
from .gate_controller import GateController


def _setup_logging(level_str: str, log_to_file: bool) -> None:
    level = getattr(logging, level_str.upper(), logging.INFO)
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    if log_to_file:
        log_path = Path(__file__).parent.parent / "bridge.log"
        handlers.append(logging.FileHandler(log_path, encoding="utf-8"))

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%H:%M:%S",
        handlers=handlers,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="HPCS Serial Bridge — ESP32 ↔ FastAPI"
    )
    parser.add_argument("--port",   help="Ghi đè COM port (vd: COM3, /dev/ttyUSB0)")
    parser.add_argument("--mode",   help="Ghi đè chế độ cổng: IN hoặc OUT", choices=["IN", "OUT"])
    parser.add_argument("--config", help="Đường dẫn tới file config JSON", default=None)
    args = parser.parse_args()

    # 1. Nạp config
    config_path = Path(args.config) if args.config else None
    cfg = (BridgeConfig.from_file(config_path) if config_path
           else BridgeConfig.from_file())
    cfg.apply_cli_overrides(port=args.port, mode=args.mode)

    # 2. Cài logging
    _setup_logging(cfg.log_level, cfg.log_to_file)
    log = logging.getLogger("bridge.main")

    log.info("╔══════════════════════════════════════╗")
    log.info("║   HPCS Serial Bridge đang khởi động  ║")
    log.info("╚══════════════════════════════════════╝")
    log.info("Cấu hình:\n%s", cfg.summary())

    # 3. Khởi tạo các module
    serial_mgr = SerialManager(cfg.serial_port, cfg.baud_rate, cfg.reconnect_delay_s)
    api        = ApiAdapter(cfg.api_url, cfg.api_timeout_s, cfg.api_retry_count)
    controller = GateController(serial_mgr, api, cfg)

    # 4. Kết nối Serial (block cho đến khi thành công)
    serial_mgr.connect_with_retry()

    # 5. Đồng bộ trạng thái ESP32
    controller.startup_sync()

    # 6. Vòng lặp chính
    try:
        controller.run()
    finally:
        serial_mgr.close()
        log.info("Bridge đã thoát.")


if __name__ == "__main__":
    main()
