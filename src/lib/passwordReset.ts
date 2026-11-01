// Pure helpers for the password-reset pages (/forgot-password and
// /reset-password). No I/O.

/**
 * Minimum password length — the signup form's `minLength` and the Supabase
 * project's default. Supabase still enforces its own setting server-side
 * (its error is mapped by toKoreanAuthError).
 */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Shown after "재설정 메일 보내기" whether or not the address has an account,
 * so the page can't be used to find out who is signed up.
 */
export const RESET_EMAIL_SENT_MESSAGE =
  "입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 메일을 보냈어요. 메일함(스팸함도)을 확인해주세요.";

/**
 * Whether a resetPasswordForEmail() error is shown to the user. Only errors
 * that say nothing about the address (no connection, malformed email) are;
 * anything else — e.g. the per-account "only request this after 60
 * seconds", which only existing accounts hit — still shows
 * RESET_EMAIL_SENT_MESSAGE so the page can't confirm an account exists.
 */
export function showResetRequestError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /failed to fetch|fetch failed|networkerror|network request failed|load failed|unable to validate email|invalid format|email address .* is invalid/i.test(
    message
  );
}

/** Where the reset email's link lands (must be in Supabase's Redirect URLs). */
export function resetPasswordRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/reset-password`;
}

/**
 * Checks the new password and its confirmation. Returns a Korean error, or
 * null when it can be sent to Supabase.
 */
export function validateNewPassword(
  password: string,
  confirm: string
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요.`;
  }
  if (password !== confirm) {
    return "두 비밀번호가 서로 달라요. 다시 확인해주세요.";
  }
  return null;
}

/**
 * True when the URL the reset page opened with is an auth callback — a PKCE
 * `code`, implicit-flow tokens in the hash, or an error Supabase appended
 * (e.g. an expired link). Used to tell "link didn't work" apart from someone
 * opening /reset-password directly.
 */
export function isAuthCallbackUrl(search: string, hash: string): boolean {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  return [
    "code",
    "token_hash",
    "access_token",
    "error",
    "error_code",
    "error_description",
  ].some((key) => query.has(key) || fragment.has(key));
}

/**
 * A recovery `token_hash` from the query, when the Supabase email template
 * links straight here as
 * `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`
 * (works even when the link opens in another browser, unlike PKCE `code`).
 */
export function recoveryTokenHash(search: string): string | null {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const tokenHash = query.get("token_hash");
  return tokenHash && query.get("type") === "recovery" ? tokenHash : null;
}
