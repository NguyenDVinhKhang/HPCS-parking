import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const db = mysql.createPool({
  host:     process.env.DB_HOST     ?? "localhost",
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER     ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME     ?? "parking_management",
});

// POST /api/students/topup
// Body: { rfid_code: string, amount: number }
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rfid_code?: string; amount?: number };
    const { rfid_code, amount } = body;

    if (!rfid_code || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Thiếu rfid_code hoặc amount không hợp lệ" },
        { status: 400 }
      );
    }

    // Kiểm tra SV tồn tại
    const [rows] = await db.execute(
      "SELECT id, full_name, balance FROM students WHERE rfid_card_code = ?",
      [rfid_code]
    ) as [Array<{ id: string; full_name: string; balance: number }>, unknown];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `Không tìm thấy sinh viên với RFID: ${rfid_code}` },
        { status: 404 }
      );
    }

    const student = rows[0];
    const newBalance = student.balance + amount;

    await db.execute(
      "UPDATE students SET balance = ? WHERE rfid_card_code = ?",
      [newBalance, rfid_code]
    );

    return NextResponse.json({
      success:     true,
      name:        student.full_name,
      rfid_code,
      old_balance: student.balance,
      added:       amount,
      new_balance: newBalance,
      message:     `Nạp ${amount.toLocaleString("vi-VN")}đ thành công cho ${student.full_name}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Lỗi hệ thống", detail: String(err) },
      { status: 500 }
    );
  }
}
