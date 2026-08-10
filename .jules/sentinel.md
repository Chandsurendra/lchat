# Sentinel Journal 🛡️

## 2026-08-10 - Password Hashing CPU Exhaustion Mitigation

**Vulnerability:** Bcrypt CPU exhaustion Denial of Service (DoS) risk.
**Learning:** Bcrypt has a maximum input length of 72 bytes. Passing massive password inputs to Bcrypt can result in excessive server-side hashing CPU load, potentially causing denial-of-service, or unexpected truncation.
**Prevention:** Always restrict incoming password lengths to a reasonable limit (e.g., 72 characters) at the schema/validation layer prior to handing it off to the auth handler.
