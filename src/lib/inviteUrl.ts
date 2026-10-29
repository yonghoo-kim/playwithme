import { headers } from "next/headers";

/**
 * Builds the absolute, shareable invite URL for a group from the current
 * request's host/protocol headers. Server-only (reads `next/headers`), so
 * call it from Server Components / Route Handlers and pass the resulting
 * string down to client components.
 */
export function buildInviteUrl(inviteCode: string): string {
  const headerList = headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/invite/${inviteCode}`;
}
