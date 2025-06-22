export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: 'active' | 'frozen' | 'deleted';
  role?: 'user' | 'admin';
  created_at: string;
  public_key_identity?: string;
  public_key_bundle?: Record<string, any>;
}

export interface Room {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  encrypted_content: string;
  reply_to_message_id?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  sender?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface Session {
  id: string;
  user_agent: string;
  ip_address: string;
  last_seen_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_user_id: string;
  type: 'mention' | 'reply';
  source_message_id: string;
  source_user_id: string;
  room_id: string;
  read_at?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  rooms?: Room[];
  message: string;
}

export interface ApiError {
  message: string;
  errors?: Array<{
    msg: string;
    param: string;
    location: string;
  }>;
}

export interface KeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export interface KeyBundle {
  identityKey: JsonWebKey;
  signedPreKey: JsonWebKey;
  oneTimeKeys: JsonWebKey[];
}