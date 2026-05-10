import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isAdminOnlyApi =
    pathname.startsWith("/api/payments/sync") ||
    (pathname.startsWith("/api/parking-rates") && request.method === "PATCH");

  const isAuthRoute = pathname.startsWith("/login");

  if (isAuthRoute) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return null; // let them see the login page
  }

  // Not an auth route, and NOT logged in
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let from = request.nextUrl.pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, request.url),
    );
  }

  if (isAdminOnlyApi) {
    if (token.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  return null;
}

export const config = {
  // Bỏ qua /api/auth, /_next, các file tĩnh tĩnh như favicon, v.v.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|fonts).*)"],
};
