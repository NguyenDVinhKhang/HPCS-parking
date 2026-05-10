import cv2
import base64
import time
import re
import numpy as np
import easyocr
import threading

print("Đang tải AI Model EasyOCR... Vui lòng chờ vài giây...")
reader = easyocr.Reader(['en'], gpu=False)
print("Tải AI Model thành công! Camera đã sẵn sàng.")

# EasyOCR/PyTorch không thread-safe khi gọi đồng thời từ nhiều thread
# Lock này đảm bảo chỉ 1 lần readtext() chạy tại 1 thời điểm
_ocr_lock = threading.Lock()

# ─── Camera Manager với Background Frame-Grab Thread ──────────────────────────
class CameraManager:
    """
    Sử dụng background thread đọc camera liên tục để:
    1. Drain buffer — tránh frame cũ bị đọng lại.
    2. Cache frame mới nhất — các API request chỉ cần lấy frame từ cache, không cần chờ cap.read().
    """
    def __init__(self, source=0):
        self.source = source
        self.cap = None
        self._frame: np.ndarray | None = None
        self._lock = threading.Lock()          # Bảo vệ self._frame
        self._running = False
        self._thread: threading.Thread | None = None

    def _open_camera(self):
        """Thử mở camera với nhiều backend khác nhau."""
        # MSMF ổn định hơn DSHOW trên Windows 10/11
        cap = cv2.VideoCapture(self.source, cv2.CAP_MSMF)
        if cap.isOpened():
            return cap
        cap.release()
        # Fallback: để OpenCV tự chọn
        cap = cv2.VideoCapture(self.source, cv2.CAP_ANY)
        return cap

    def _grab_loop(self):
        """
        Background thread: đọc frame liên tục → đảm bảo buffer luôn được drain.
        Frame mới nhất được cache vào self._frame để các request lấy ngay không chờ.
        """
        while self._running:
            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret:
                    with self._lock:
                        self._frame = frame
            time.sleep(0.01)  # ~100fps đọc từ buffer, nhanh hơn webcam thật → luôn có frame mới nhất

    def start(self):
        """Khởi động camera và background thread nếu chưa chạy."""
        if self._running:
            return
        self.cap = self._open_camera()
        if not self.cap.isOpened():
            print("[CameraManager] Không thể mở camera!")
            return
        # Đợi camera khởi động
        time.sleep(0.5)
        self._running = True
        self._thread = threading.Thread(target=self._grab_loop, daemon=True)
        self._thread.start()
        print("[CameraManager] Background grab thread đã khởi động.")

    def stop(self):
        """Dừng background thread và giải phóng camera."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        if self.cap:
            self.cap.release()
            self.cap = None
        self._frame = None
        print("[CameraManager] Camera đã dừng.")

    def get_status(self) -> bool:
        return self._running and self.cap is not None and self.cap.isOpened()

    def capture_frame(self) -> str | None:
        """Lấy frame hiện tại dưới dạng Base64 JPEG. Không chờ — trả về ngay từ cache."""
        if not self._running:
            self.start()
            # Chờ frame đầu tiên tối đa 3 giây
            for _ in range(30):
                if self._frame is not None:
                    break
                time.sleep(0.1)

        with self._lock:
            frame = self._frame.copy() if self._frame is not None else None

        if frame is None:
            return None

        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return base64.b64encode(buffer).decode('utf-8')

    def capture_raw_frame(self) -> np.ndarray | None:
        """Lấy raw frame numpy để xử lý OCR — không tốn encode/decode."""
        if not self._running:
            self.start()
            for _ in range(30):
                if self._frame is not None:
                    break
                time.sleep(0.1)

        with self._lock:
            return self._frame.copy() if self._frame is not None else None

    # Tương thích ngược với code cũ dùng initialize() / release()
    def initialize(self):
        self.start()

    def release(self):
        self.stop()


# Singleton instance
camera_manager = CameraManager(source=0)
# Khởi động ngay khi server load để camera warm-up sớm
camera_manager.start()

# ─── OCR Preprocessing Pipeline ───────────────────────────────────────────────
def preprocess_frame(frame: np.ndarray) -> list:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # CLAHE: Tăng tương phản cục bộ (hiệu quả cho biển số bị chói/tối)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)

    # Adaptive Threshold: phân tách nền/chữ theo vùng cục bộ
    adaptive = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )

    # Scale 2x cho biển số nhỏ trong khung hình rộng
    h, w = blurred.shape
    upscaled = cv2.resize(blurred, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

    return [blurred, adaptive, upscaled]


def _extract_best_plate(all_results: list) -> dict:
    """
    Ghép các đoạn text theo thứ tự vị trí (trên→dưới, trái→phải).
    Biển số Việt Nam có 2 dòng nên phải kết hợp tất cả đoạn lại.
    """
    ALLOWLIST = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')

    if not all_results:
        return {"plate_number": "KHÔNG THẤY BIỂN SỐ", "confidence": 0.0}

    # Bước 1: Lọc và dedup — loại bỏ kết quả trùng lặp từ 3 preprocessing versions
    seen_texts: set[str] = set()
    unique_results = []

    for item in all_results:
        bbox, text, prob = item
        # Làm sạch hậu kỳ: EasyOCR đọc tự nhiên, ta lọc chỉ giữ alphanumeric
        # Dùng re.sub thay vì ALLOWLIST để tránh tình trạng dấu '-' bị map thành 'F'
        norm = re.sub(r'[^A-Z0-9]', '', text.upper())
        # Tối thiểu 2 kí tự, confidence > 25%, chưa thấy đoạn text này
        if len(norm) >= 2 and prob > 0.25 and norm not in seen_texts:
            seen_texts.add(norm)
            # Lấy tọa độ góc trên-trái của bounding box để sort theo vị trí
            if len(bbox) == 4:
                y = min(pt[1] for pt in bbox)
                x = min(pt[0] for pt in bbox)
            else:
                y, x = 0, 0
            unique_results.append((y, x, norm, float(prob)))

    if not unique_results:
        return {"plate_number": "KHÔNG THẤY BIỂN SỐ", "confidence": 0.0}

    # Bước 2: Sort theo vị trí — trên→dưới (y), trái→phải (x)
    unique_results.sort(key=lambda r: (r[0], r[1]))

    # Bước 3: Ghép tất cả đoạn text theo thứ tự đọc
    plate_parts = [r[2] for r in unique_results]
    combined = ''.join(plate_parts)
    avg_conf = sum(r[3] for r in unique_results) / len(unique_results)

    if not combined:
        return {"plate_number": "KHÔNG THẤY BIỂN SỐ", "confidence": 0.0}

    return {"plate_number": combined, "confidence": avg_conf}


# ─── ROI Detection — Tìm vùng biển số trước khi OCR ──────────────────────────

def _score_contours(mask: np.ndarray, frame: np.ndarray) -> np.ndarray | None:
    """
    Tìm contour hình chữ nhật có tỷ lệ khung giống biển số trong mask.
    Trả về vùng crop (với padding) hoặc None.
    """
    h_frame, w_frame = frame.shape[:2]
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:40]

    best = None
    best_score = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 600:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        if h == 0:
            continue

        ratio = w / float(h)
        # Biển số VN: xe máy ~1.7-2.5, ô tô ~3.5-5.5
        if not (1.5 < ratio < 6.5):
            continue

        # Không chấp nhận region chiếm hơn 85% frame (tránh chọn cả frame)
        if w > w_frame * 0.85 or h > h_frame * 0.85:
            continue

        # Score: diện tích lớn + càng gần hình chữ nhật hoàn hảo càng tốt
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        rect_bonus = 1.5 if len(approx) == 4 else 1.0
        score = area * rect_bonus

        if score > best_score:
            best_score = score
            best = (x, y, w, h)

    if best is None:
        return None

    x, y, w, h = best
    # Padding 20% chiều cao để không cắt mất chữ
    pad_x = int(w * 0.12)
    pad_y = int(h * 0.25)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w_frame, x + w + pad_x)
    y2 = min(h_frame, y + h + pad_y)

    return frame[y1:y2, x1:x2]


def find_plate_roi(frame: np.ndarray) -> np.ndarray | None:
    """
    Tìm và crop vùng biển số trước khi OCR.

    Chiến lược 1 — Color-based (ưu tiên):
        Biển số VN màu trắng (S thấp, V cao) hoặc vàng (H ~20-35).
        Đây là cách phân biệt biển số với nền tốt nhất trong điều kiện thường.

    Chiến lược 2 — Edge-based (fallback):
        Canny edge detection + contour filtering khi ánh sáng làm mất màu trắng.

    Returns: Cropped plate image (BGR) hoặc None nếu không tìm được.
    """
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    # ── Chiến lược 1: Color thresholding ──────────────────────────────────────
    # Biển trắng: Saturation thấp, Value cao
    white_mask = cv2.inRange(hsv, (0, 0, 170), (180, 60, 255))
    # Biển vàng (xe tải, đặc biệt): Hue 15-38, S cao, V cao
    yellow_mask = cv2.inRange(hsv, (15, 80, 140), (38, 255, 255))
    color_mask = cv2.bitwise_or(white_mask, yellow_mask)

    # Morphological ops: lấp lỗ hổng nhỏ, loại bỏ chấm nhiễu
    k_close = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 5))
    k_open  = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_CLOSE, k_close)
    color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_OPEN,  k_open)

    roi = _score_contours(color_mask, frame)
    if roi is not None and roi.size > 0:
        print("[ROI] Tìm thấy bằng color thresholding")
        return roi

    # ── Chiến lược 2: Edge-based fallback ─────────────────────────────────────
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    # Bilateral filter: giảm nhiễu, giữ cạnh sắc
    filtered = cv2.bilateralFilter(gray, 11, 17, 17)
    edges = cv2.Canny(filtered, 30, 200)

    # Dilate nối các cạnh bị đứt
    k_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (4, 2))
    edges = cv2.dilate(edges, k_dilate, iterations=1)

    roi = _score_contours(edges, frame)
    if roi is not None and roi.size > 0:
        print("[ROI] Tìm thấy bằng edge detection")
        return roi

    print("[ROI] Không tìm được biển số, dùng toàn bộ frame")
    return None


def _run_ocr_on_frame(frame: np.ndarray) -> dict:
    """
    Pipeline OCR:
    1. Tìm ROI biển số (crop để loại bỏ nền nhiễu)
    2. Enhance contrast + scale 2x
    3. EasyOCR readtext
    4. Ghép kết quả theo vị trí
    """
    # ── Bước 1: Crop ROI ──────────────────────────────────────────────────────
    target = find_plate_roi(frame)
    if target is None or target.size == 0:
        target = frame   # Fallback: toàn bộ frame

    # ── Bước 2: Enhance + scale 2x ────────────────────────────────────────────
    gray = cv2.cvtColor(target, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    h, w = enhanced.shape
    upscaled = cv2.resize(enhanced, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    processed = cv2.GaussianBlur(upscaled, (3, 3), 0)

    # ── Bước 3: OCR ───────────────────────────────────────────────────────────
    with _ocr_lock:
        results = reader.readtext(
            processed,
            paragraph=False,
            detail=1
        )

    # Scale bbox về kích thước trước upscale để sort vị trí đúng
    scaled_results = [
        ([[pt[0] / 2, pt[1] / 2] for pt in bbox], text, prob)
        for (bbox, text, prob) in results
    ]

    return _extract_best_plate(scaled_results)



# ─── Public API ───────────────────────────────────────────────────────────────
def scan_plate(base64_img_str: str) -> dict:
    """Nhận diện biển số từ ảnh Base64."""
    try:
        if "," in base64_img_str:
            base64_img_str = base64_img_str.split(",")[1]
        img_data = base64.b64decode(base64_img_str)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"plate_number": "LỖI ẢNH", "confidence": 0.0}
        return _run_ocr_on_frame(frame)
    except Exception as e:
        print(f"[OCR Error] {str(e)}")
        return {"plate_number": "LỖI HỆ THỐNG", "confidence": 0.0}


def scan_plate_from_raw(frame: np.ndarray) -> dict:
    """Nhận diện biển số từ raw numpy frame."""
    try:
        return _run_ocr_on_frame(frame)
    except Exception as e:
        print(f"[OCR Live Error] {str(e)}")
        return {"plate_number": "LỖI HỆ THỐNG", "confidence": 0.0}
