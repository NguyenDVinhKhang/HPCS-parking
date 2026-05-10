"""
payment/student_bank.py — Thanh toán tự động cho Sinh Viên
===========================================================
Logic: Trừ balance trong DB ngay lập tức → mở barrier.
Không cần xác nhận bên ngoài.

Điều kiện: users.balance >= FEE
Kết quả  : session.status = CLOSED, barrier_open = True
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from payment.base import PaymentStrategy, PaymentResult


class StudentBankPayment(PaymentStrategy):
    """
    Sinh viên trả tiền tự động qua balance ảo trong hệ thống.
    Fee cố định 2,000đ/lượt.
    """

    FEE: int = 2000  # VND

    async def process(self, session, db) -> PaymentResult:
        # Lấy thông tin SV từ DB
        student = db.query(models.Student).filter(
            models.Student.rfid_card_code == session.rfid_code
        ).first()

        if not student:
            return PaymentResult(
                success=False,
                barrier_open=False,
                message="Lỗi hệ thống: Không tìm thấy thông tin sinh viên.",
            )

        # Kiểm tra đủ tiền
        if student.balance < self.FEE:
            return PaymentResult(
                success=False,
                barrier_open=False,
                message=(
                    f"Số dư không đủ ({student.balance:,}đ < {self.FEE:,}đ). "
                    f"Vui lòng nạp thêm tiền tại quầy bảo vệ."
                ),
                extra={"balance": student.balance, "fee": self.FEE},
            )

        # Trừ tiền
        student.balance -= self.FEE
        remaining = student.balance

        # Cập nhật session
        session.fee_amount = self.FEE
        session.payment_method = "BANK_AUTO"
        session.status = "CLOSED"

        db.commit()

        return PaymentResult(
            success=True,
            barrier_open=True,
            message=(
                f"Đã trừ {self.FEE:,}đ tự động. "
                f"Số dư còn lại: {remaining:,}đ."
            ),
            extra={"fee": self.FEE, "remaining": remaining},
        )
