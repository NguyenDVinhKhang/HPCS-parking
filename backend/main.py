from dotenv import load_dotenv
load_dotenv()   # phải gọi TRƯỚC khi import camera.scanner (đọc CAMERA_ENABLED)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from camera.scanner import camera_manager, scan_plate, scan_plate_from_raw
from payos_router import router as payment_router
import base64

app = FastAPI(title="HPCS Camera Service")

# Cấu hình CORS cho phép NextJS gọi API từ cổng mặc định 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount PayOS Payment Router
app.include_router(payment_router)

# Mount Students Router (sinh viên RFID)
from routers.students import router as students_router
app.include_router(students_router)

# Mount Gate Router
from routers.gate_router import router as gate_router
app.include_router(gate_router)

# Mount Static Files — phục vụ ảnh biển số qua HTTP
# URL: http://localhost:8000/static/plates/entry/xxx.jpg
_static_dir = Path(__file__).parent / "static"
_static_dir.mkdir(exist_ok=True)   # tạo thư mục nếu chưa có
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

@app.on_event("shutdown")
def shutdown_event():
    camera_manager.release()

@app.get("/api/camera/health")
def camera_health():
    is_online = camera_manager.get_status()
    if not is_online:
        return {"status": "offline", "camera_id": "0"}
    return {"status": "online", "camera_id": "0"}

@app.get("/api/camera/capture")
def camera_capture():
    """Trả về frame hiện tại để hiển thị live stream (không chạy OCR)."""
    base64_img = camera_manager.capture_frame()
    if not base64_img:
        raise HTTPException(status_code=500, detail="Không thể đọc dữ liệu từ webcam!")
    return {
        "status": "success",
        "image_data": f"data:image/jpeg;base64,{base64_img}"
    }

@app.get("/api/camera/detect-live")
def camera_detect_live():
    """
    Chụp frame + chạy OCR trong 1 request.
    Dùng cho tính năng nhận diện biển số liên tục (không cần bấm nút).
    Gọi ở tần suất thấp hơn stream (~1 lần/1.5s) vì OCR tốn CPU.
    """
    # Lấy raw frame để tránh encode/decode thừa
    frame = camera_manager.capture_raw_frame()
    if frame is None:
        raise HTTPException(status_code=500, detail="Camera không khả dụng.")

    # Chạy OCR trực tiếp trên raw frame
    ocr_result = scan_plate_from_raw(frame)

    # Cũng encode frame thành base64 để frontend có thể hiển thị ảnh tại thời điểm nhận diện
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    frame_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "plate_number": ocr_result["plate_number"],
        "confidence": ocr_result["confidence"],
        "image_data": f"data:image/jpeg;base64,{frame_b64}"
    }

@app.get("/api/scan-plate")
def api_scan_plate(camera_id: str = "entry_cam_1"):
    """Chụp ảnh + nhận diện biển số (khi bấm nút Chụp ảnh)."""
    base64_img = camera_manager.capture_frame()
    if not base64_img:
        raise HTTPException(status_code=500, detail="Capture lỗi. File ảnh rỗng.")

    result = scan_plate(base64_img)

    return {
        "camera_id": camera_id,
        "image_data": f"data:image/jpeg;base64,{base64_img}",
        "plate_number": result["plate_number"],
        "confidence": result["confidence"]
    }
