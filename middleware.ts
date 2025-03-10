// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This middleware runs on the edge and can be used to inject R2 bindings
export const middleware = (request: NextRequest) => {
  // Pass through the request without modification
  return NextResponse.next();
};

// Configure the paths where this middleware should run
export const config = {
  matcher: [
    // Only apply to API routes that need R2 access
    "/api/images/:path*",
    "/api/upload/:path*",
    "/static/:path*",
  ],
};
