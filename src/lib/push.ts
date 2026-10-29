export interface PushPayload {
  title: string;
  body: string;
}

// True when the name's last character is a Hangul syllable with a final
// consonant (받침), e.g. 지훈 -> true, 민호 -> false. Non-Hangul endings and
// empty strings count as no 받침.
export function hasBatchim(name: string): boolean {
  const lastCharCode = name.charCodeAt(name.length - 1) - 0xac00;
  return lastCharCode >= 0 && lastCharCode <= 11171 && lastCharCode % 28 !== 0;
}

// Korean subject-particle rule: a name ending in a closed syllable (받침
// present) takes an inserted "이" before "가" (e.g. 지훈 -> 지훈이가); a name
// ending in an open syllable takes bare "가" (e.g. 민호 -> 민호가).
function withSubjectParticle(name: string): string {
  return hasBatchim(name) ? `${name}이가` : `${name}가`;
}

export function formatPushPayload(
  childName: string,
  placeName: string | null
): PushPayload {
  const subject = withSubjectParticle(childName);
  return {
    title: "나랑 놀자",
    body: placeName
      ? `${subject} ${placeName}에 나왔어요! 같이 놀아요! 🎈`
      : `${subject} 집에 갔어요 🏠`,
  };
}

export function excludeToken(
  tokens: string[],
  deviceToken: string | null
): string[] {
  return deviceToken == null
    ? tokens
    : tokens.filter((t) => t !== deviceToken);
}

export interface SendGroupPushResult {
  successTokens: string[];
  failedTokens: string[];
}

export interface PushMessaging {
  sendEachForMulticast: (message: {
    tokens: string[];
    data: Record<string, string>;
  }) => Promise<{ responses: { success: boolean }[] }>;
}

// Data-only on purpose: a `notification` payload is auto-displayed by the
// FCM web SDK *in addition to* the service worker's own showNotification,
// which produced duplicate notifications. The SW renders `data` itself.
export async function sendGroupPush(
  messaging: PushMessaging,
  tokens: string[],
  payload: PushPayload,
  options: { tag?: string; url?: string } = {}
): Promise<SendGroupPushResult> {
  const data: Record<string, string> = {
    title: payload.title,
    body: payload.body,
    url: options.url ?? "/dashboard",
  };
  if (options.tag) {
    data.tag = options.tag;
  }
  const response = await messaging.sendEachForMulticast({ tokens, data });

  const successTokens: string[] = [];
  const failedTokens: string[] = [];

  response.responses.forEach((result: { success: boolean }, index: number) => {
    if (result.success) {
      successTokens.push(tokens[index]);
    } else {
      failedTokens.push(tokens[index]);
    }
  });

  return { successTokens, failedTokens };
}
