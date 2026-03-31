import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content-Security-Policy — prevents XSS injection & limits resource origins
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",       // Next.js requires unsafe-inline/eval in dev; production strips eval
      "style-src 'self' 'unsafe-inline'",                       // Tailwind injects inline styles
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' https://generativelanguage.googleapis.com ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}`.trim(),
      "img-src 'self' data: blob:",
      "media-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // HSTS — force HTTPS for 2 years (ignored on localhost)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Prevent browsers from detecting/opening the site's content as a different MIME type
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
