import { withDirectionParticle } from "./korean";

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

// Korean subject particle: 이 after a final consonant (고이현 -> 고이현이),
// 가 after an open syllable (김하나 -> 김하나가).
function withSubjectParticle(name: string): string {
  return hasBatchim(name) ? `${name}이` : `${name}가`;
}

// Title = the group(s) the recipient shares with the child (the phone already
// shows the app name above it); the app name only when there is none.
// `going` = on the way ("놀이터로 가는 중이에요"), not there yet.
export function formatPushPayload(
  childName: string,
  placeName: string | null,
  groupNames: string[],
  going = false
): PushPayload {
  const subject = withSubjectParticle(childName);
  return {
    title: groupNames.length > 0 ? groupNames.join(" · ") : "나랑 놀자",
    body: going
      ? `${subject} ${withDirectionParticle(placeName ?? "집")} 가는 중이에요 🚶`
      : placeName
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
