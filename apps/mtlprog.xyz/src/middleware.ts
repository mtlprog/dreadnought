import { NextResponse, type NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get theme from cookie, default to "dark"
  const theme = request.cookies.get("theme")?.value || "dark";

  // Set theme class in response header for the client
  // This will be read by layout to apply theme without flash
  response.headers.set("x-theme", theme === "system" ? "dark" : theme);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
