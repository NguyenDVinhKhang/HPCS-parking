import mysql from "mysql2/promise";

/**
 * MariaDB Connection Pool
 *
 * Cấu hình kết nối MariaDB thông qua biến môi trường.
 * Đặt các biến sau trong file .env.local:
 *
 * DB_HOST=localhost
 * DB_PORT=3306
 * DB_USER=root
 * DB_PASSWORD=
 * DB_NAME=parking_management
 */

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "parking_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;

type DbParam =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | undefined
  | Buffer
  | Uint8Array
  | {}
  | Record<string, unknown>;

/**
 * Helper: thực thi query
 */
export async function query<T>(sql: string, params?: DbParam[]): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}
