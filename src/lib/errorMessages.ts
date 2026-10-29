/** Shown whenever an error has no friendlier Korean wording. */
export const GENERIC_ERROR = "문제가 생겼어요. 잠시 후 다시 시도해주세요.";

/**
 * Supabase Auth errors (and the browser's fetch errors) arrive as English
 * text. Patterns are matched case-insensitively anywhere in the message and
 * the first match wins, so more specific rules come before broader ones.
 */
const AUTH_ERROR_RULES: {
  pattern: RegExp;
  korean: (match: RegExpMatchArray) => string;
}[] = [
  {
    pattern: /invalid login credentials/i,
    korean: () => "이메일 또는 비밀번호가 맞지 않아요.",
  },
  {
    pattern: /email not confirmed/i,
    korean: () => "메일 인증을 먼저 완료해주세요. 받은 메일함을 확인해주세요.",
  },
  {
    pattern: /already (been )?registered/i,
    korean: () => "이미 가입된 이메일이에요. 로그인해주세요.",
  },
  {
    pattern: /signups? (is |are )?(not allowed|disabled)/i,
    korean: () => "지금은 새로 가입할 수 없어요.",
  },
  {
    // Keep the project's configured minimum length.
    pattern: /password should be at least (\d+) character/i,
    korean: (m) => `비밀번호는 ${m[1]}자 이상이어야 해요.`,
  },
  {
    pattern: /weak|password should contain/i,
    korean: () =>
      "비밀번호가 너무 쉬워요. 영문, 숫자를 섞어 더 길게 만들어주세요.",
  },
  {
    pattern: /should be different from the old password/i,
    korean: () => "이전 비밀번호와 다른 비밀번호를 입력해주세요.",
  },
  {
    pattern: /unable to validate email|invalid format|email address .* is invalid/i,
    korean: () => "이메일 형식이 올바르지 않아요.",
  },
  {
    // "For security purposes, you can only request this after 45 seconds."
    pattern: /only request this after (\d+) second/i,
    korean: (m) => `보안을 위해 ${m[1]}초 후에 다시 시도해주세요.`,
  },
  {
    pattern: /email rate limit/i,
    korean: () => "메일을 너무 자주 보냈어요. 잠시 후 다시 시도해주세요.",
  },
  {
    pattern: /rate limit|too many requests/i,
    korean: () => "요청이 너무 많아요. 잠시 후 다시 시도해주세요.",
  },
  {
    // Chrome / Node / Firefox / React Native / Safari wordings.
    pattern:
      /failed to fetch|fetch failed|networkerror|network request failed|load failed/i,
    korean: () => "인터넷 연결을 확인하고 다시 시도해주세요.",
  },
  {
    pattern: /expired|invalid link|link is invalid|token is invalid/i,
    korean: () => "링크가 만료되었거나 올바르지 않아요. 다시 요청해주세요.",
  },
];

/**
 * Turns a Supabase Auth error message into friendly Korean. Unknown
 * messages become GENERIC_ERROR — English is never passed through.
 */
export function toKoreanAuthError(message: string | undefined | null): string {
  if (!message) return GENERIC_ERROR;
  for (const { pattern, korean } of AUTH_ERROR_RULES) {
    const match = message.match(pattern);
    if (match) return korean(match);
  }
  return GENERIC_ERROR;
}
