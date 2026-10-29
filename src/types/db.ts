export interface User {
  id: string;
  email: string;
  active_child_id: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

/** A family's own place (owned by the guardian who created it, shared with
 * that child's other guardians) — not tied to a group. */
export interface Place {
  id: string;
  created_by: string;
  name: string;
  icon_name: string;
  created_at: string;
}

export interface FcmToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
}

/** One status per child, shared with every group the child belongs to. */
export interface CurrentStatus {
  child_id: string;
  place_id: string | null;
  updated_at: string;
}

/** A child exists on its own; group membership lives in ChildGroup. */
export interface Child {
  id: string;
  name: string;
  created_at: string;
}

/** Many-to-many: a child can be in several groups. */
export interface ChildGroup {
  child_id: string;
  group_id: string;
  joined_at: string;
}

export interface ChildGuardian {
  child_id: string;
  user_id: string;
  joined_at: string;
}
