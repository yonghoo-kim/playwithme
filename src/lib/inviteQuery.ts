/**
 * Query string that carries an invite (and its optional `from` child id)
 * between /invite, /login and /signup. Empty when there's no invite.
 * Safe to use on both server and client.
 */
export function inviteQuery(
  invite?: string | null,
  from?: string | null
): string {
  if (!invite) return "";
  const params = new URLSearchParams({ invite });
  if (from) params.set("from", from);
  return `?${params.toString()}`;
}

/** First value of a Next.js `searchParams` entry. */
export function firstParam(
  value: string | string[] | undefined
): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v : null;
}
