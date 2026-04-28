import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasAuthSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name === "better-auth.session_token" ||
        cookie.name.endsWith("better-auth.session_token"),
    );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isSignedIn = hasAuthSessionCookie(request);

  if (pathname.startsWith("/account") && !isSignedIn) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/signin" && isSignedIn) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/signin"],
};
