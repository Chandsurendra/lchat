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
