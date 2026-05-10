"""
payment/guest_qr.py — Thanh toán QR PayOS cho Khách vãng lai
=============================================================
Logic:
  1. Tạo link QR PayOS (4,000đ)
  2. Session giữ status = OPEN, payment_method = PENDING
  3. barrier_open = False → Bridge gửi DENIED → ESP32 nháy đỏ
  4. Khi PayOS Webhook về → payment.py webhook handler sẽ:
       - Đóng session (CLOSED)
       - Push OPEN-OUT qua bridge (port 5001)

NOTE: File payment.py (legacy) chứa PayOS helper và webhook handler.
      File này CHỈ là wrapper gọi hàm từ payment.py và trả PaymentResult
      theo interface chuẩn.
"""
import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from payment.base import PaymentStrategy, PaymentResult

logger = logging.getLogger(__name__)


class GuestQRPayment(PaymentStrategy):
    """
    Khách vãng lai thanh toán qua QR PayOS.
    Barrier KHÔNG mở ngay — chờ PayOS webhook xác nhận.
    """

    FEE: int = 4000  # VND

    async def process(self, session, db) -> PaymentResult:
        # Cập nhật session — chưa đóng, chờ webhook
        session.fee_amount = self.FEE
        session.payment_method = "PENDING"
        # status giữ nguyên "OPEN" — sẽ chuyển CLOSED khi PayOS webhook về
        db.commit()

        # Gọi PayOS tạo QR
        try:
            # Import từ payment.py legacy (chứa PayOS client và helper)
            import payment as payos_module
            qr_data = await payos_module.create_guest_qr(
                session_id=session.session_id,
                plate_number=session.exit_plate_number or "UNKNOWN",
            )
        except Exception as e:
            logger.error(f"Lỗi tạo QR PayOS: {e}")
            return PaymentResult(
                success=False,
                barrier_open=False,
                message=f"Lỗi tạo QR thanh toán: {e}. Vui lòng dùng tiền mặt.",
                extra={"fee": self.FEE},
            )

        return PaymentResult(
            success=True,       # tạo QR thành công
            barrier_open=False, # nhưng barrier chưa mở, chờ webhook
            message=f"Vui lòng quét mã QR để thanh toán {self.FEE:,}đ.",
            extra={"qr_data": qr_data, "fee": self.FEE},
        )
