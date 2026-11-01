import { describe, it, expect } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  RESET_EMAIL_SENT_MESSAGE,
  isAuthCallbackUrl,
  recoveryTokenHash,
  resetPasswordRedirectUrl,
  showResetRequestError,
  validateNewPassword,
} from "./passwordReset";

describe("resetPasswordRedirectUrl", () => {
  it("points at /reset-password on the given origin", () => {
    expect(resetPasswordRedirectUrl("https://narangnol.vercel.app")).toBe(
      "https://narangnol.vercel.app/reset-password"
    );
    expect(resetPasswordRedirectUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000/reset-password"
    );
  });
});

describe("validateNewPassword", () => {
  it("matches the signup minimum length", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6);
    expect(validateNewPassword("12345", "12345")).toBe(
      "비밀번호는 6자 이상이어야 해요."
    );
    expect(validateNewPassword("123456", "123456")).toBeNull();
  });

  it("requires the confirmation to match", () => {
    expect(validateNewPassword("abcdef1", "abcdef2")).toContain("서로 달라요");
  });
});

describe("RESET_EMAIL_SENT_MESSAGE", () => {
  it("does not reveal whether the account exists", () => {
    expect(RESET_EMAIL_SENT_MESSAGE).toContain("계정이 있다면");
  });
});

describe("showResetRequestError", () => {
  it("shows connection and email-format errors", () => {
    expect(showResetRequestError("Failed to fetch")).toBe(true);
    expect(
      showResetRequestError("Unable to validate email address: invalid format")
    ).toBe(true);
  });

  it("hides errors that could reveal whether the account exists", () => {
    expect(
      showResetRequestError(
        "For security purposes, you can only request this after 52 seconds."
      )
    ).toBe(false);
    expect(showResetRequestError("User not found")).toBe(false);
    expect(showResetRequestError("Email rate limit exceeded")).toBe(false);
    expect(showResetRequestError(null)).toBe(false);
  });
});

describe("recoveryTokenHash", () => {
  it("reads a recovery token_hash", () => {
    expect(recoveryTokenHash("?token_hash=abc&type=recovery")).toBe("abc");
  });

  it("ignores other types or a missing hash", () => {
    expect(recoveryTokenHash("?token_hash=abc&type=signup")).toBeNull();
    expect(recoveryTokenHash("?type=recovery")).toBeNull();
    expect(recoveryTokenHash("")).toBeNull();
  });
});

describe("isAuthCallbackUrl", () => {
  it("detects a PKCE code or Supabase tokens/errors", () => {
    expect(isAuthCallbackUrl("?code=abc", "")).toBe(true);
    expect(isAuthCallbackUrl("", "#access_token=x&type=recovery")).toBe(true);
    expect(
      isAuthCallbackUrl(
        "",
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
      )
    ).toBe(true);
    expect(isAuthCallbackUrl("?error_description=x", "")).toBe(true);
  });

  it("detects a token_hash link", () => {
    expect(isAuthCallbackUrl("?token_hash=abc&type=recovery", "")).toBe(true);
  });

  it("is false for a plain visit", () => {
    expect(isAuthCallbackUrl("", "")).toBe(false);
    expect(isAuthCallbackUrl("?next=/dashboard", "")).toBe(false);
  });
});
