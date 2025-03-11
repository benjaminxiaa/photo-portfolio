// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only run middleware for API routes that need protection
  if (
    request.nextUrl.pathname.startsWith("/api/upload") ||
    (request.nextUrl.pathname.startsWith("/api/images") &&
      request.method !== "GET") ||
    request.nextUrl.pathname.startsWith("/api/webhook")
  ) {
    // Get host from request headers
    const host = request.headers.get("host") || "";

    // Only allow requests from your own domain to enhance security
    // This helps prevent cross-site request forgery (CSRF)
    if (!host.includes("benjaminxia.com") && !host.includes("localhost")) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Not authorized" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // For more secure environments, you could add additional checks
    // such as validating a CSRF token or checking for a specific header
  }

  return NextResponse.next();
}
