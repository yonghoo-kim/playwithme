import { describe, expect, it } from "vitest";
import { inviteMetadata, inviteShareText, OG_IMAGE } from "./inviteMetadata";

describe("inviteShareText", () => {
  it("names the inviting family and the group", () => {
    expect(inviteShareText({ groupName: "가재울 놀이터", inviterLabel: "채윤이네" }).title).toBe(
      "채윤이네가 '가재울 놀이터' 그룹에 초대했어요 🎈"
    );
  });

  it("falls back to 친구 without a verified inviter", () => {
    expect(inviteShareText({ groupName: "놀이터", inviterLabel: null }).title).toBe(
      "친구가 '놀이터' 그룹에 초대했어요 🎈"
    );
  });
});

describe("inviteMetadata", () => {
  it("is empty without an invite", () => {
    expect(inviteMetadata(null)).toEqual({});
  });

  it("carries the preview image with the invite text", () => {
    const meta = inviteMetadata({ code: "abc", groupName: "놀이터", inviterLabel: "지훈이네" });
    expect(meta.openGraph?.title).toBe("지훈이네가 '놀이터' 그룹에 초대했어요 🎈");
    expect(meta.openGraph?.images).toEqual([OG_IMAGE]);
  });
});
