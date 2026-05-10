import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { query } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Tài khoản test mặc định (bypass DB)
        if (credentials.username === "admin" && credentials.password === "admin123") {
          return {
            id: "999",
            name: "Quản trị viên (Test)",
            role: "admin",
          };
        }

        try {
          const result = await query(
            "SELECT id, username, password_hash as password, full_name as name, role FROM users WHERE username = ?",
            [credentials.username]
          ) as Array<{ id: number; username: string; password: string; name: string; role: string }>;

          const user = result[0];

          if (!user) {
            return null;
          }

          // Ở database/init.sql mật khẩu là plain-text: "admin123"
          if (user.password !== credentials.password) {
            return null;
          }

          // Return matched user object
          return {
            id: user.id.toString(),
            name: user.name,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // @ts-expect-error -> extend next-auth types
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      // @ts-expect-error -> extend next-auth types
      session.user.role = token.role;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
});
