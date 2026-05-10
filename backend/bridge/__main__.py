"""
bridge/__main__.py
Entry point: python -m bridge [--port COM9] [--mode OUT] [--config path]

Ví dụ:
  python -m bridge                        # dùng bridge_config.json
  python -m bridge --port COM3            # override port
  python -m bridge --port COM3 --mode OUT # cổng ra

─────────────────────────────────────────────────────────
ARCHITECTURE: 2 thread chạy song song

  Thread 1 (main): GateController.run()
    → đọc serial liên tục
    → nhận IN:{uid} / OUT:{uid} từ ESP32
    → gọi API backend → gửi OPEN-IN/OUT hay DENIED

  Thread 2 (daemon): CommandServer (Flask mini HTTP)
    → lắng nghe POST http://localhost:5001/send
    → backend gọi khi cần push lệnh bất kỳ lúc nào
      (vd: PayOS webhook xác nhận → push OPEN-OUT)
    → daemon=True: tự tắt khi main thread thoát

─────────────────────────────────────────────────────────
"""

import argparse
import logging
import sys
import threading
from pathlib import Path

from .config          import BridgeConfig
from .api_adapter     import ApiAdapter
from .serial_manager  import SerialManager
from .gate_controller import GateController


# ─────────────────────────────────────────────────────────────
#  CommandServer — Mini HTTP server nhận lệnh từ backend
# ─────────────────────────────────────────────────────────────
class CommandServer:
    """
    HTTP server nhỏ chạy trên port 5001.
    Backend (payment, webhook) POST vào đây để push lệnh xuống ESP32.

    Endpoint:
        POST http://localhost:5001/send
        Body: {"cmd": "OPEN-OUT"}   hoặc {"cmd": "OPEN-IN"} / {"cmd": "DENIED"}

    Ví dụ backend gọi:
        import requests
        requests.post("http://localhost:5001/send", json={"cmd": "OPEN-OUT"})

    Lý do cần server này:
        - Bridge chạy vòng lặp serial → không thể "chờ" callback từ PayOS
        - Khi PayOS webhook về, backend cần NGAY LẬP TỨC gửi OPEN-OUT
        - Server này là "cửa sau" để backend push lệnh vào bridge bất kỳ lúc nào
    """

    ALLOWED_COMMANDS = {"OPEN-IN", "OPEN-OUT", "DENIED", "PING"}

    def __init__(self, serial_mgr: SerialManager, host: str = "127.0.0.1", port: int = 5001):
        self.serial_mgr = serial_mgr
        self.host       = host
        self.port       = port
        self.log        = logging.getLogger("bridge.cmd_server")

    def start_in_thread(self) -> threading.Thread:
        """Khởi động server trong daemon thread. Tự tắt khi main thread thoát."""
        t = threading.Thread(target=self._run, daemon=True, name="cmd-server")
        t.start()
        self.log.info("CommandServer khởi động trên http://%s:%d/send", self.host, self.port)
        return t

    def _run(self):
        """Chạy Flask app (blocking — trong thread riêng)."""
        try:
            from flask import Flask, request as flask_req, jsonify
        except ImportError:
            self.log.error(
                "Thiếu thư viện 'flask'. Cài đặt: pip install flask\n"
                "CommandServer sẽ KHÔNG chạy — backend không thể push lệnh."
            )
            return

        app = Flask("bridge-cmd")
        app.logger.disabled = True          # tắt Flask access log
        log = self.log

        @app.post("/send")
        def send_cmd():
            data = flask_req.get_json(silent=True) or {}
            cmd  = data.get("cmd", "").strip().upper()

            if not cmd:
                return jsonify({"ok": False, "error": "Thiếu field 'cmd'"}), 400

            if cmd not in self.ALLOWED_COMMANDS:
                return jsonify({
                    "ok":    False,
                    "error": f"Lệnh '{cmd}' không hợp lệ.",
                    "allowed": list(self.ALLOWED_COMMANDS),
                }), 400

            success = self.serial_mgr.send(cmd)
            if success:
                log.info("[HTTP→Serial] Gửi lệnh: %s ✓", cmd)
            else:
                log.warning("[HTTP→Serial] Gửi lệnh %s thất bại (serial mất kết nối?)", cmd)

            return jsonify({"ok": success, "cmd": cmd})

        @app.get("/health")
        def health():
            return jsonify({
                "status":          "ok",
                "serial_connected": self.serial_mgr.is_connected(),
            })

        # Tắt log Werkzeug
        import logging as stdlib_logging
        stdlib_logging.getLogger("werkzeug").setLevel(stdlib_logging.ERROR)

        app.run(host=self.host, port=self.port, debug=False, use_reloader=False)


# ─────────────────────────────────────────────────────────────
#  Logging setup
# ─────────────────────────────────────────────────────────────
def _setup_logging(level_str: str, log_to_file: bool) -> None:
    level    = getattr(logging, level_str.upper(), logging.INFO)
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    if log_to_file:
        log_path = Path(__file__).parent.parent / "bridge.log"
        handlers.append(logging.FileHandler(log_path, encoding="utf-8"))

    logging.basicConfig(
        level   = level,
        format  = "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt = "%H:%M:%S",
        handlers= handlers,
    )


# ─────────────────────────────────────────────────────────────
#  main()
# ─────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="HPCS Serial Bridge — ESP32 ↔ FastAPI")
    parser.add_argument("--port",   help="Ghi đè COM port (vd: COM3, /dev/ttyUSB0)")
    parser.add_argument("--mode",   help="Ghi đè chế độ cổng: IN hoặc OUT", choices=["IN", "OUT"])
    parser.add_argument("--config", help="Đường dẫn tới file config JSON", default=None)
    parser.add_argument("--cmd-port", help="Port cho CommandServer HTTP (mặc định: 5001)",
                        type=int, default=5001)
    args = parser.parse_args()

    # 1. Nạp config
    config_path = Path(args.config) if args.config else None
    cfg = (BridgeConfig.from_file(config_path) if config_path
           else BridgeConfig.from_file())
    cfg.apply_cli_overrides(port=args.port, mode=args.mode)

    # 2. Cài logging
    _setup_logging(cfg.log_level, cfg.log_to_file)
    log = logging.getLogger("bridge.main")

    log.info("╔══════════════════════════════════════════╗")
    log.info("║   HPCS Serial Bridge đang khởi động      ║")
    log.info("╚══════════════════════════════════════════╝")
    log.info("Cấu hình:\n%s", cfg.summary())

    # 3. Khởi tạo các module
    serial_mgr = SerialManager(cfg.serial_port, cfg.baud_rate, cfg.reconnect_delay_s)
    api        = ApiAdapter(cfg.api_url, cfg.api_timeout_s, cfg.api_retry_count)
    controller = GateController(serial_mgr, api, cfg)

    # 4. Khởi động CommandServer HTTP (thread 2 — daemon)
    cmd_server = CommandServer(serial_mgr, port=args.cmd_port)
    cmd_server.start_in_thread()

    # 5. Kết nối Serial (block cho đến khi thành công)
    serial_mgr.connect_with_retry()

    # 6. Đồng bộ trạng thái ESP32
    controller.startup_sync()

    # 7. Vòng lặp chính (thread 1 — blocking)
    try:
        controller.run()
    finally:
        serial_mgr.close()
        log.info("Bridge đã thoát.")


if __name__ == "__main__":
    main()
