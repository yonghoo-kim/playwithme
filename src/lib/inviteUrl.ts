import { headers } from "next/headers";

/**
 * Builds the absolute, shareable invite URL for a group from the current
 * request's host/protocol headers. Server-only (reads `next/headers`), so
 * call it from Server Components / Route Handlers and pass the resulting
 * string down to client components. Pass `fromChildId` to attribute the
 * invite to one of the sharer's children.
 */
export function buildInviteUrl(
  inviteCode: string,
  fromChildId?: string
): string {
  const headerList = headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  // `from` attributes the invite to a child ("지훈이네가 초대했어요"); it is
  // only a hint — getInviteContext re-checks it belongs to the group.
  const from = fromChildId ? `?from=${encodeURIComponent(fromChildId)}` : "";
  return `${proto}://${host}/invite/${inviteCode}${from}`;
}
