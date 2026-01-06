import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const allowList = [
  "https://darkan-fin.vercel.app",
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

const allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS";

export const config = {
  matcher: "/api/:path*", // Apply only to API routes
};

export default function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const isAllowed = origin && allowList.includes(origin);
  const requestHeaders =
    request.headers.get("access-control-request-headers") ||
    "Content-Type, Authorization";

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: isAllowed ? 200 : 204,
      headers: isAllowed
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": allowedMethods,
            "Access-Control-Allow-Headers": requestHeaders,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
          }
        : {},
    });
  }

  const response = NextResponse.next();

  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}
