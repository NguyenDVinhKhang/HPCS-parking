"""
payment/ — Payment Strategy Module
===================================
Mỗi phương thức thanh toán là 1 file độc lập.
Để thêm phương thức mới (Momo, VNPay...):
  1. Tạo file mới kế thừa PaymentStrategy
  2. Đăng ký vào PAYMENT_REGISTRY trong gate_router.py
  Không cần sửa bất kỳ file nào khác.
"""
from .base import PaymentStrategy, PaymentResult

__all__ = ["PaymentStrategy", "PaymentResult"]
