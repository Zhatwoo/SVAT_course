import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_LOGIN_PATH,
  AUTH_LOGIN_PATH,
  SESSION_COOKIE,
  isAdminPath,
  isGuestAuthPath,
  isUserPath,
  verifySession,
} from "@/lib/auth/session";

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function loginRedirect(request: NextRequest, pathname: string) {
  const loginPath = isAdminPath(pathname) ? ADMIN_LOGIN_PATH : AUTH_LOGIN_PATH;
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return redirect(request, AUTH_LOGIN_PATH);
  }

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const hasValidSession = session !== null;
  const role = session?.role ?? null;

  if (isGuestAuthPath(pathname) && hasValidSession) {
    return redirect(request, role === "admin" ? "/admin" : "/user");
  }

  if (isUserPath(pathname)) {
    if (!hasValidSession) {
      return loginRedirect(request, pathname);
    }
    return NextResponse.next();
  }

  if (isAdminPath(pathname)) {
    if (!hasValidSession) {
      return loginRedirect(request, pathname);
    }
    if (role !== "admin") {
      return redirect(request, "/user");
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/user/:path*",
    "/admin/:path*",
    "/auth/login",
    "/auth/login/:path*",
    "/auth/signup",
    "/auth/signup/:path*",
  ],
};
