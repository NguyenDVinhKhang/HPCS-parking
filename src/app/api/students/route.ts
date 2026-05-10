import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const db = mysql.createPool({
  host:     process.env.DB_HOST     ?? "localhost",
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER     ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME     ?? "parking_management",
});

export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT rfid_card_code, full_name, student_code, balance, created_at
       FROM students ORDER BY full_name`
    );
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json(
      { error: "Không thể tải danh sách sinh viên", detail: String(err) },
      { status: 500 }
    );
  }
}
