# Sentinel Security Journal

## 2026-08-09 - Path Traversal via Unsanitized File Upload Extensions

**Vulnerability:** The storage service used a naive `file.name.split('.').pop()` to extract file extensions. A malicious client could supply a filename containing directory traversal characters (e.g., `test.jpg/../../otheruser/avatar`) which would resolve to an unsanitized extension of `jpg/../../otheruser/avatar`. When uploaded to Supabase storage, this path would bypass intended user boundaries and allow overwriting or creating files in other users' storage paths.
**Learning:** File names provided by client-side uploads are completely untrusted inputs. Simply extracting extensions by splitting on `.` without resolving or isolating the base file name first allows path-manipulation segments to be included in the final storage path.
**Prevention:** Always isolate the basename of the file (stripping any path separators) before extracting the extension. Additionally, sanitize the extension to contain only alphanumeric characters and enforce a strict length limit (e.g., 10 characters) to prevent any injection or unexpected behaviors.
