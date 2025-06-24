import { auth } from "@/auth";

interface Route {
  paths: string[];
  permissions?: string[];
}

const protectedRoutes: Route[] = [
  {
    paths: ["/dashboard/*", "/onboarding"],
    permissions: ["view_account"],
  },
];

const isProtectedRoute = (pathname: string): boolean => {
  return protectedRoutes.some((route) =>
    route.paths.some((path) => {
      const isWildcard = path.endsWith("/*");
      const basePath = isWildcard ? path.slice(0, -2) : path;

      return isWildcard ? pathname.startsWith(basePath) : pathname === path;
    }),
  );
};

export default auth(async (req) => {
  const { user } = req.auth || {};
  const onboardingDone = user?.onboardingDone as boolean;
  const userSignedIn = !!user;
  const currentPath = req.nextUrl.pathname;
  const isOnboarding = currentPath.startsWith("/onboarding");
  const isAuthPage = currentPath.startsWith("/auth/signin");

  // Redirect unauthenticated users from protected routes
  if (!user && isProtectedRoute(currentPath)) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl.origin));
  }

  // Redirect authenticated users from auth pages
  if (userSignedIn && onboardingDone && isAuthPage) {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }

  // Handle onboarding flow
  if (userSignedIn && !onboardingDone && !isOnboarding) {
    return Response.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  if ((!userSignedIn || onboardingDone) && isOnboarding) {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }

  return;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
