import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "");
}

async function getSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { userId: string; role: "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN" };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("ponto_session")?.value;
  const session = token ? await getSession(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && session.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/manager") && !["MANAGER", "SUPER_ADMIN"].includes(session.role)) {
    return NextResponse.redirect(new URL("/employee/dashboard", request.url));
  }

  if (pathname.startsWith("/employee") && session.role !== "EMPLOYEE") {
    const redirectPath = session.role === "SUPER_ADMIN" ? "/admin/managers" : "/manager/dashboard";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // /profile is accessible by all authenticated users

  if (pathname === "/") {
    let defaultPath = "/employee/dashboard";
    if (session.role === "SUPER_ADMIN") defaultPath = "/admin";
    else if (session.role === "MANAGER") defaultPath = "/manager/dashboard";

    return NextResponse.redirect(new URL(defaultPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts).*)"],
};
