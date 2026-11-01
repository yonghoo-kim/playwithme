import { describe, it, expect } from "vitest";
import {
  CONSENT_ITEMS,
  LEGAL_VERSION,
  NO_CONSENT,
  allConsented,
  consentMetadata,
  setAllConsent,
  toggleConsent,
} from "./consent";

describe("signup consent", () => {
  it("lists the three required items, linking the legal pages", () => {
    expect(CONSENT_ITEMS.map((item) => item.key)).toEqual([
      "terms",
      "privacy",
      "child",
    ]);
    expect(CONSENT_ITEMS.every((item) => item.label.startsWith("[필수]"))).toBe(
      true
    );
    expect(CONSENT_ITEMS.find((item) => item.key === "terms")?.href).toBe(
      "/terms"
    );
    expect(CONSENT_ITEMS.find((item) => item.key === "privacy")?.href).toBe(
      "/privacy"
    );
  });

  it("starts with nothing checked", () => {
    expect(allConsented(NO_CONSENT)).toBe(false);
  });

  it("needs every item before signup can proceed", () => {
    let state = toggleConsent(NO_CONSENT, "terms", true);
    expect(allConsented(state)).toBe(false);
    state = toggleConsent(state, "privacy", true);
    expect(allConsented(state)).toBe(false);
    state = toggleConsent(state, "child", true);
    expect(allConsented(state)).toBe(true);
    expect(allConsented(toggleConsent(state, "privacy", false))).toBe(false);
  });

  it("전체 동의 checks and clears everything", () => {
    expect(allConsented(setAllConsent(true))).toBe(true);
    expect(setAllConsent(false)).toEqual(NO_CONSENT);
  });

  it("does not mutate the previous state", () => {
    const before = { ...NO_CONSENT };
    toggleConsent(before, "terms", true);
    expect(before).toEqual(NO_CONSENT);
  });

  it("records the versions and the consent time", () => {
    const now = new Date("2026-11-01T03:04:05.000Z");
    expect(consentMetadata(now)).toEqual({
      terms_version: LEGAL_VERSION,
      privacy_version: LEGAL_VERSION,
      guardian_consent: true,
      consented_at: "2026-11-01T03:04:05.000Z",
    });
    expect(LEGAL_VERSION).toBe("2026-11-01");
  });
});
