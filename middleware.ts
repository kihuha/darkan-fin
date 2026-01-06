import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: "/api/:path*", // Apply only to API routes
};

export default function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Define allowed origins dynamically
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? ["https://darkan-fin.vercel.app"]
      : ["http://localhost:3000"];

  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "null",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Continue with the request and add CORS headers to the response
  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}
