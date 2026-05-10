import serial
import requests
import time
import sys

# Cấu hình
API_URL = "http://localhost:8000/api/gate"
DEFAULT_COM_PORT = "COM9"
BAUDRATE = 115200

def connect_serial(port):
    try:
        ser = serial.Serial(port, BAUDRATE, timeout=1)
        print(f"[*] Đã kết nối thành công tới cổng {port} với baudrate {BAUDRATE}")
        return ser
    except serial.SerialException as e:
        print(f"[!] Lỗi kết nối Serial: {e}")
        return None

def send_command(ser, cmd):
    if ser and ser.is_open:
        ser.write((cmd + "\n").encode('utf-8'))
        print(f"[>] Đã gửi tới ESP32: {cmd}")

def handle_card(ser, direction, uid):
    print(f"\n[*] Nhận thẻ từ cổng {direction}: {uid}")
    
    endpoint = f"{API_URL}/entry" if direction == "IN" else f"{API_URL}/exit"
    payload = {"rfid_code": uid}
    
    try:
        print(f"[*] Đang gọi API: POST {endpoint}")
        response = requests.post(endpoint, json=payload, timeout=8)
        data = response.json()
        
        if response.status_code == 200 and data.get("success"):
            print(f"[V] API Thành công: {data.get('message', '')}")
            
            # Kiểm tra xem có được mở cổng không
            # (Trường hợp khách hàng vãng lai lúc ra phải quét QR, barrier_open = False)
            if direction == "IN":
                send_command(ser, "OPEN-IN")
            else:
                if data.get("barrier_open", True):
                    send_command(ser, "OPEN-OUT")
                else:
                    print(f"[!] Cần thanh toán. Không tự động mở cổng ra. Vui lòng quét QR.")
                    send_command(ser, "DENIED") # Báo cho ESP32 biết để reset trạng thái
                    
        else:
            err_detail = data.get("detail", "Lỗi không xác định từ Server")
            print(f"[X] API Từ chối: {err_detail}")
            send_command(ser, "DENIED")
            
    except requests.exceptions.RequestException as e:
        print(f"[!] Lỗi kết nối tới Server API: {e}")
        send_command(ser, "DENIED")

def main():
    port = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_COM_PORT
    ser = connect_serial(port)
    
    if not ser:
        print("[-] Không thể mở cổng Serial. Vui lòng kiểm tra cáp kết nối và port.")
        sys.exit(1)
        
    print("[*] Đang lắng nghe tín hiệu từ ESP32... (Nhấn Ctrl+C để thoát)\n")
    
    try:
        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()
                if not line:
                    continue
                
                print(f"[<] Nhận từ ESP32: {line}")
                
                if line.startswith("IN:"):
                    uid = line.split(":", 1)[1]
                    handle_card(ser, "IN", uid)
                elif line.startswith("OUT:"):
                    uid = line.split(":", 1)[1]
                    handle_card(ser, "OUT", uid)
                # Bỏ qua các message trạng thái khác như STATUS, IR_STATUS, PONG...
                
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\n[*] Đang đóng kết nối Serial...")
        ser.close()
        print("[*] Đã thoát.")

if __name__ == "__main__":
    main()
