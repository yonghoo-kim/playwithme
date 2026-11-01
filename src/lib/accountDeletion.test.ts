import { describe, it, expect } from "vitest";
import {
  DELETE_ACCOUNT_MESSAGE,
  groupOwnerCandidates,
  isAppStorageKey,
} from "./accountDeletion";

describe("groupOwnerCandidates", () => {
  const rows = [
    { child_id: "c1", user_id: "me" },
    { child_id: "c2", user_id: "u2" },
    { child_id: "c2", user_id: "u3" },
    { child_id: "c3", user_id: "u4" },
    { child_id: "c3", user_id: "u2" },
  ];

  it("orders guardians by when their child joined, skipping me", () => {
    expect(groupOwnerCandidates("me", ["c1", "c3", "c2"], rows)).toEqual([
      "u4",
      "u2",
      "u3",
    ]);
  });

  it("lists each guardian once", () => {
    expect(groupOwnerCandidates("me", ["c2", "c3"], rows)).toEqual([
      "u2",
      "u3",
      "u4",
    ]);
  });

  it("includes a co-guardian of my own child", () => {
    expect(
      groupOwnerCandidates("me", ["c1"], [
        { child_id: "c1", user_id: "me" },
        { child_id: "c1", user_id: "partner" },
      ])
    ).toEqual(["partner"]);
  });

  it("is empty when nobody else is left", () => {
    expect(groupOwnerCandidates("me", ["c1"], rows)).toEqual([]);
    expect(groupOwnerCandidates("me", [], rows)).toEqual([]);
  });
});

describe("isAppStorageKey", () => {
  it("matches only this app's keys", () => {
    expect(isAppStorageKey("playwithme_fcm_token")).toBe(true);
    expect(isAppStorageKey("playwithme_weather_coords")).toBe(true);
    expect(isAppStorageKey("sb-abc-auth-token")).toBe(false);
    expect(isAppStorageKey("other")).toBe(false);
  });
});

describe("DELETE_ACCOUNT_MESSAGE", () => {
  it("warns that it can't be undone", () => {
    expect(DELETE_ACCOUNT_MESSAGE).toContain("되돌릴 수 없어요");
  });
});
