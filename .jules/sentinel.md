# Sentinel's Journal - Critical Security Learnings Only

## 2025-02-15 - Dynamic Content Security Policy with Try-Catch URL Parsing in SvelteKit

**Vulnerability:** Understrict or missing Content Security Policy (CSP) and secure HTTP response headers (such as X-Frame-Options, X-Content-Type-Options) exposing the application to Cross-Site Scripting (XSS), clickjacking, and MIME sniffing attacks.
**Learning:** When dynamically constructing CSP rules in SvelteKit `hooks.server.ts` based on external service URLs (like Supabase API urls), standard URL parsing using `new URL(PUBLIC_SUPABASE_URL)` will fail during local builds or tests when environment variables are dummy values or entirely absent.
**Prevention:** Always wrap the parsing of external services' URLs inside a robust `try-catch` block. If parsing fails, fall back to safe default/self values gracefully, ensuring that local testing, build pipelines, and dev environments do not break.
