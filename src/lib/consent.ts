// Signup consent ("[필수] 이용약관 동의" etc.). Pure, so SignupForm stays thin
// and this is testable. The legal pages (/terms, /privacy) carry the same
// effective date as LEGAL_VERSION; bump both together when they change.

/** Effective date of the current /terms and /privacy texts. */
export const LEGAL_VERSION = "2026-11-01";

export type ConsentKey = "terms" | "privacy" | "child";

export type ConsentState = Record<ConsentKey, boolean>;

/** Every required consent, in the order the signup form lists them. */
export const CONSENT_ITEMS: {
  key: ConsentKey;
  label: string;
  /** The document to read, opened in a new tab so the form keeps its state. */
  href?: string;
}[] = [
  { key: "terms", label: "[필수] 이용약관 동의", href: "/terms" },
  { key: "privacy", label: "[필수] 개인정보 수집·이용 동의", href: "/privacy" },
  {
    key: "child",
    label: "[필수] 만 14세 미만 아이 정보를 보호자로서 등록하는 것에 동의",
  },
];

export const NO_CONSENT: ConsentState = {
  terms: false,
  privacy: false,
  child: false,
};

/** True once every required item is checked (signup may proceed). */
export function allConsented(state: ConsentState): boolean {
  return CONSENT_ITEMS.every(({ key }) => state[key]);
}

/** "전체 동의": checks or clears every item at once. */
export function setAllConsent(checked: boolean): ConsentState {
  return { terms: checked, privacy: checked, child: checked };
}

/** One item toggled; the others stay as they were. */
export function toggleConsent(
  state: ConsentState,
  key: ConsentKey,
  checked: boolean
): ConsentState {
  return { ...state, [key]: checked };
}

/**
 * What signUp() stores in the new user's metadata
 * (`options.data`, i.e. auth.users.raw_user_meta_data) as the consent record.
 */
export function consentMetadata(now: Date): {
  terms_version: string;
  privacy_version: string;
  guardian_consent: true;
  consented_at: string;
} {
  return {
    terms_version: LEGAL_VERSION,
    privacy_version: LEGAL_VERSION,
    guardian_consent: true,
    consented_at: now.toISOString(),
  };
}
