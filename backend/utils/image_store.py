"""
utils/image_store.py — Lưu ảnh biển số ra file, trả về đường dẫn
==================================================================
Thay vì lưu base64 vào DB (phình DB), lưu file JPEG ra đĩa.
DB chỉ lưu đường dẫn tương đối: "plates/entry/20260510_223000_698D2B3F.jpg"

Cấu trúc thư mục:
    backend/static/
        plates/
            entry/   ← ảnh chụp lúc xe vào
            exit/    ← ảnh chụp lúc xe ra

Truy cập ảnh qua HTTP:
    http://localhost:8000/static/plates/entry/20260510_223000_698D2B3F.jpg
"""
import base64
import logging
from datetime import datetime
from pathlib import Path

log = logging.getLogger(__name__)

# Thư mục gốc lưu ảnh — tương đối từ vị trí file này
_BASE_DIR = Path(__file__).parent.parent / "static" / "plates"


def save_plate_image(
    base64_img: str | None,
    rfid_code: str,
    direction: str,       # "entry" | "exit"
) -> str:
    """
    Lưu ảnh biển số từ base64 ra file JPEG.

    Args:
        base64_img : Chuỗi base64 từ camera_manager.capture_frame()
                     Có thể là None (camera offline) → trả về ""
        rfid_code  : Mã thẻ RFID (dùng đặt tên file)
        direction  : "entry" hoặc "exit"

    Returns:
        Đường dẫn tương đối lưu vào DB, ví dụ:
            "plates/entry/20260510_223000_698D2B3F.jpg"
        Hoặc "" nếu không có ảnh / lỗi ghi file.
    """
    if not base64_img:
        return ""

    try:
        # Tạo thư mục nếu chưa có
        save_dir = _BASE_DIR / direction
        save_dir.mkdir(parents=True, exist_ok=True)

        # Tên file: ngày_giờ_rfid.jpg
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_rfid = rfid_code.replace(":", "").replace("/", "")[:20]
        filename  = f"{timestamp}_{safe_rfid}.jpg"
        filepath  = save_dir / filename

        # Decode base64 → bytes → ghi file
        img_bytes = base64.b64decode(base64_img)
        filepath.write_bytes(img_bytes)

        # Trả về đường dẫn tương đối (lưu vào DB)
        rel_path = f"plates/{direction}/{filename}"
        log.info("Lưu ảnh %s: %s", direction, rel_path)
        return rel_path

    except Exception as e:
        log.error("Lỗi lưu ảnh %s (rfid=%s): %s", direction, rfid_code, e)
        return ""


def get_image_url(rel_path: str, base_url: str = "http://localhost:8000") -> str:
    """
    Chuyển đường dẫn tương đối thành URL đầy đủ để frontend hiển thị.

    Args:
        rel_path : "plates/entry/20260510_223000_698D2B3F.jpg"
        base_url : URL gốc của backend

    Returns:
        "http://localhost:8000/static/plates/entry/20260510_223000_698D2B3F.jpg"
        Hoặc "" nếu rel_path rỗng.
    """
    if not rel_path:
        return ""
    return f"{base_url}/static/{rel_path}"
