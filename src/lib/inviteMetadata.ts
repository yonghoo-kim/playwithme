import type { Metadata } from "next";
import type { InviteContext } from "./inviteContext";

export const SITE_URL = "https://narangnol.vercel.app";
export const SITE_DESCRIPTION = "친구들과 실시간으로 놀이 상태를 공유해요";

/** Link-preview image (src/app/og/route.tsx), 1200×630. */
export const OG_IMAGE = { url: "/og", width: 1200, height: 630, alt: "나랑 놀자" };

/** Title/description a messenger shows under an invite link. */
export function inviteShareText(invite: Pick<InviteContext, "groupName" | "inviterLabel">): {
  title: string;
  description: string;
} {
  return {
    title: `${invite.inviterLabel ?? "친구"}가 '${invite.groupName}' 그룹에 초대했어요 🎈`,
    description: "아이들이 지금 어디서 노는지 보고, 같이 놀아요!",
  };
}

/** Open Graph metadata for a page reached from an invite link (null = default). */
export function inviteMetadata(invite: InviteContext | null): Metadata {
  if (!invite) return {};
  const { title, description } = inviteShareText(invite);
  return {
    description,
    openGraph: {
      title,
      description,
      siteName: "나랑 놀자",
      locale: "ko_KR",
      type: "website",
      images: [OG_IMAGE],
    },
  };
}
