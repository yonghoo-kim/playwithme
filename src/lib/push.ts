export interface PushPayload {
  title: string;
  body: string;
}

// Korean subject-particle rule: a name ending in a closed syllable (받침
// present) takes an inserted "이" before "가" (e.g. 지훈 -> 지훈이가); a name
// ending in an open syllable takes bare "가" (e.g. 민호 -> 민호가).
function withSubjectParticle(name: string): string {
  const lastCharCode = name.charCodeAt(name.length - 1) - 0xac00;
  const hasBatchim =
    lastCharCode >= 0 && lastCharCode <= 11171 && lastCharCode % 28 !== 0;
  return hasBatchim ? `${name}이가` : `${name}가`;
}

export function formatPushPayload(
  childName: string,
  placeName: string
): PushPayload {
  return {
    title: "나랑 놀자 🎈",
    body: `${withSubjectParticle(childName)} ${placeName}에 나왔어요! 같이 놀아요! 🎈`,
  };
}

export interface SendGroupPushResult {
  successTokens: string[];
  failedTokens: string[];
}

export async function sendGroupPush(
  messaging: { sendEachForMulticast: (message: any) => Promise<any> },
  tokens: string[],
  payload: PushPayload
): Promise<SendGroupPushResult> {
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: payload,
  });

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
