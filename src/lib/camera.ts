const FASTAPI_URL = "http://127.0.0.1:8000";

export async function checkCameraHealth() {
    try {
        const res = await fetch(`${FASTAPI_URL}/api/camera/health`, { cache: 'no-store' });
        const data = await res.json();
        return data.status === "online";
    } catch {
        return false;
    }
}

export async function captureCameraFrame() {
    const res = await fetch(`${FASTAPI_URL}/api/camera/capture`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Capture failed");
    const data = await res.json();
    return data.image_data;
}

export async function detectLive(): Promise<{
    plate_number: string;
    confidence: number;
    image_data: string;
}> {
    const res = await fetch(`${FASTAPI_URL}/api/camera/detect-live`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Detect live failed");
    return await res.json();
}

export async function scanPlate(cameraId: string = "entry_cam_1") {
    const res = await fetch(`${FASTAPI_URL}/api/scan-plate?camera_id=${cameraId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Scan plate failed");
    return await res.json();
}
