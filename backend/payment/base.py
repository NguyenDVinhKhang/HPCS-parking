"""
payment/base.py — Interface contract cho tất cả payment strategy
================================================================
PaymentResult  : Kết quả trả về chuẩn hóa, không phụ thuộc vào
                 phương thức thanh toán cụ thể.
PaymentStrategy: Abstract class — mọi strategy phải implement
                 phương thức process().

Bên ngoài (gate_router, gate_service) CHỈ làm việc với 2 class này.
Thay đổi logic bên trong từng strategy không ảnh hưởng router.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class PaymentResult:
    """
    Kết quả chuẩn hóa từ mọi strategy thanh toán.

    Attributes:
        success      : Thanh toán thành công hay không
        barrier_open : True → bridge gửi OPEN-OUT ngay lập tức
                       False → bridge gửi DENIED, chờ sự kiện khác
        message      : Thông báo hiển thị / log
        extra        : Dữ liệu bổ sung tùy strategy:
                         StudentBank  → {"fee": 2000, "remaining": 48000}
                         GuestQR      → {"qr_data": {...}, "fee": 4000}
                         GuestCash    → {"fee": 4000}
    """
    success: bool
    barrier_open: bool
    message: str
    extra: dict = field(default_factory=dict)


class PaymentStrategy(ABC):
    """
    Interface chung cho tất cả phương thức thanh toán.

    Cách thêm phương thức mới:
        class GuestMomoPayment(PaymentStrategy):
            async def process(self, session, db) -> PaymentResult:
                # ... logic Momo ...
                return PaymentResult(True, True, "Đã thanh toán qua Momo")
    """

    @abstractmethod
    async def process(self, session, db) -> PaymentResult:
        """
        Xử lý thanh toán cho 1 parking session.

        Args:
            session : ParkingSession ORM object (đã có exit_plate_number,
                      exit_time, rfid_code, session_type)
            db      : SQLAlchemy Session

        Returns:
            PaymentResult với đầy đủ thông tin để router trả về HTTP response
            và bridge quyết định gửi OPEN-OUT hay DENIED.
        """
        ...
