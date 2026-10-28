export interface PushPayload {
  title: string;
  body: string;
}

export function formatPushPayload(
  childName: string,
  placeName: string
): PushPayload {
  return {
    title: "나랑 놀자 🎈",
    body: `${childName}이가 ${placeName}에 나왔어요! 같이 놀아요! 🎈`,
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
