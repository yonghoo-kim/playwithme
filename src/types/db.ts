export interface User {
  id: string;
  email: string;
  child_name: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface Place {
  id: string;
  group_id: string;
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

export interface CurrentStatus {
  user_id: string;
  group_id: string;
  place_id: string | null;
  updated_at: string;
}
