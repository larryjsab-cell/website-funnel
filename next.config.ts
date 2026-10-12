import type { NextConfig } from "next";

const SUPABASE = "https://woejhqidgykrcdyktuio.supabase.co";
// GA4 only loads once site.config.json has a real measurement ID, but allowing it here
// means adding the ID never needs a header change.
const GA = ["https://www.googletagmanager.com"];
const GA_CONNECT = ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com"];

// Next.js streams its page data in inline <script> tags, so scripts need 'unsafe-inline'
// (nonces would force every page to render per request and lose static caching).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GA.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // Demo screenshots in emails and on /go-live can live on any https host.
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE} ${GA_CONNECT.join(" ")}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // /api/checkout answers the plan form with a redirect to Stripe Checkout.
  "form-action 'self' https://checkout.stripe.com",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // Dev needs eval and hot reload, so the policy applies to production builds only.
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
