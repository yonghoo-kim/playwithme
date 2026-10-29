/**
 * Only same-origin relative paths are allowed as a post-login/post-signup
 * destination: must start with "/", must not start with "//"
 * (protocol-relative), and must not contain "\" or control/whitespace
 * characters (browsers turn "/\evil.com" or "/\t/evil.com" into
 * "//evil.com"). Anything else is dropped, so `next` can't be used as an
 * open redirect. Safe to use on both server and client.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
