"""
payment/guest_cash.py — Thu tiền mặt cho Khách vãng lai
=========================================================
Logic:
  1. Đóng session ngay (CLOSED)
  2. Push lệnh OPEN-OUT xuống ESP32 qua bridge HTTP server (port 5001)

Dùng khi: Bảo vệ bấm nút "Xác nhận đã thu tiền mặt" trên UI,
          HOẶC khi bridge nhận request /exit?method=CASH.

Không cần PayOS, không cần xác nhận bên ngoài.
"""
import logging
import requests

from payment.base import PaymentStrategy, PaymentResult

logger = logging.getLogger(__name__)

BRIDGE_PUSH_URL = "http://localhost:5001/send"  # Bridge mini HTTP server


class GuestCashPayment(PaymentStrategy):
    """
    Khách vãng lai trả tiền mặt trực tiếp cho bảo vệ.
    Bảo vệ xác nhận → hệ thống đóng session → mở barrier.
    """

    FEE: int = 4000  # VND

    async def process(self, session, db) -> PaymentResult:
        # Cập nhật session
        session.fee_amount = self.FEE
        session.payment_method = "CASH"
        session.status = "CLOSED"

        # Trả thẻ Guest về trạng thái rảnh
        import models
        guest_card = db.query(models.GuestCard).filter(
            models.GuestCard.rfid_card_code == session.rfid_code
        ).first()
        if guest_card:
            guest_card.status = "AVAILABLE"

        db.commit()

        # Push lệnh OPEN-OUT xuống ESP32 qua bridge HTTP server
        self._push_open_out()

        return PaymentResult(
            success=True,
            barrier_open=True,  # bridge đã tự push, router dùng để log
            message=f"Đã thu {self.FEE:,}đ tiền mặt. Mở cổng ra.",
            extra={"fee": self.FEE},
        )

    def _push_open_out(self):
        """Gọi bridge HTTP server để push OPEN-OUT xuống ESP32."""
        try:
            resp = requests.post(
                BRIDGE_PUSH_URL,
                json={"cmd": "OPEN-OUT"},
                timeout=3,
            )
            if resp.ok:
                logger.info("Bridge push OPEN-OUT: OK")
            else:
                logger.warning(f"Bridge push OPEN-OUT failed: {resp.text}")
        except requests.exceptions.ConnectionError:
            # Bridge chưa chạy hoặc mất kết nối — ghi log, không crash
            logger.error(
                "Không kết nối được bridge HTTP server (port 5001). "
                "Đảm bảo bridge đang chạy: python -m bridge --port COM9"
            )
