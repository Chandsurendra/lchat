# Sentinel's Journal - Critical Security Learnings Only

## 2025-02-15 - Dynamic Content Security Policy with Try-Catch URL Parsing in SvelteKit

**Vulnerability:** Understrict or missing Content Security Policy (CSP) and secure HTTP response headers (such as X-Frame-Options, X-Content-Type-Options) exposing the application to Cross-Site Scripting (XSS), clickjacking, and MIME sniffing attacks.
**Learning:** When dynamically constructing CSP rules in SvelteKit `hooks.server.ts` based on external service URLs (like Supabase API urls), standard URL parsing using `new URL(PUBLIC_SUPABASE_URL)` will fail during local builds or tests when environment variables are dummy values or entirely absent.
**Prevention:** Always wrap the parsing of external services' URLs inside a robust `try-catch` block. If parsing fails, fall back to safe default/self values gracefully, ensuring that local testing, build pipelines, and dev environments do not break.

## 2026-08-07 - Defensive Security Headers & Restrictive Content Security Policy (CSP)

**Vulnerability:** Surprising security gap in this app's architecture where no standard HTTP security headers (e.g., X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) or Content Security Policy (CSP) were set on resolved responses, leaving the application vulnerable to clickjacking, MIME type sniffing, and potential XSS/unauthorized resource injection.
**Learning:** By default, SvelteKit resolves server responses without injecting typical secure HTTP headers unless explicitly configured in `hooks.server.ts` or configured globally. When integrating external cloud platforms like Supabase, omitting CSP definitions can allow a compromised or malicious script to load content from or send sensitive data to arbitrary origins.
**Prevention:** Always intercept resolved responses inside the SvelteKit Server `Handle` hook to explicitly set security headers. Use dynamic parsing of environment variables like `PUBLIC_SUPABASE_URL` to restrict script, image, media, and WebSocket connections (CSP `connect-src`, `img-src`, `media-src`) precisely to 'self' and the specific Supabase domains.

## 2026-08-07 - missing security response headers in sveltekit hooks

**Vulnerability:** Complete absence of defense-in-depth security HTTP headers, exposing the application to clickjacking attacks, MIME-type confusion/sniffing, and unconstrained hardware capabilities/APIs (such as geolocation, camera, or microphone) inside server-rendered pages.
**Learning:** SvelteKit does not automatically set strict default security headers for server-rendered HTML pages unless explicitly configured in server-side handles (`hooks.server.ts`). This is a surprising security gap in the architecture for developers assuming SvelteKit's built-in router handles HTTP hardening out of the box.
**Prevention:** Always intercept resolved responses in `hooks.server.ts` to manually apply robust security response headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `X-XSS-Protection`).

# Sentinel Journal 🛡️

## 2026-08-10 - Password Hashing CPU Exhaustion Mitigation

**Vulnerability:** Bcrypt CPU exhaustion Denial of Service (DoS) risk.
**Learning:** Bcrypt has a maximum input length of 72 bytes. Passing massive password inputs to Bcrypt can result in excessive server-side hashing CPU load, potentially causing denial-of-service, or unexpected truncation.
**Prevention:** Always restrict incoming password lengths to a reasonable limit (e.g., 72 characters) at the schema/validation layer prior to handing it off to the auth handler.

# Sentinel Security Journal

## 2026-08-09 - Path Traversal via Unsanitized File Upload Extensions

**Vulnerability:** The storage service used a naive `file.name.split('.').pop()` to extract file extensions. A malicious client could supply a filename containing directory traversal characters (e.g., `test.jpg/../../otheruser/avatar`) which would resolve to an unsanitized extension of `jpg/../../otheruser/avatar`. When uploaded to Supabase storage, this path would bypass intended user boundaries and allow overwriting or creating files in other users' storage paths.
**Learning:** File names provided by client-side uploads are completely untrusted inputs. Simply extracting extensions by splitting on `.` without resolving or isolating the base file name first allows path-manipulation segments to be included in the final storage path.
**Prevention:** Always isolate the basename of the file (stripping any path separators) before extracting the extension. Additionally, sanitize the extension to contain only alphanumeric characters and enforce a strict length limit (e.g., 10 characters) to prevent any injection or unexpected behaviors.
