export type RoomState =
  | "LOBBY"
  | "PREPARING"
  | "PLAYING"
  | "ROUND_RESULT"
  | "FINISHED";

export type SystemAvatarId =
  | "avatar-black"
  | "avatar-blue"
  | "avatar-pink"
  | "avatar-red"
  | "avatar-yellow";

export type SystemAvatarSelection = { avatarId: SystemAvatarId } | { random: true };

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string | null;
  border: string | null;
  bgColor: string | null;
  connected: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  totalScore: number;
}

export interface EmojiReaction {
  id: string;
  playerId: string;
  name: string;
  avatar: string | null;
  emoji: number;
  sentAt: string;
}

export type PlayerDirectoryEntry = Pick<
  RoomPlayer,
  "name" | "avatar" | "border" | "bgColor"
>;

export type PlayerDirectory = Record<string, PlayerDirectoryEntry>;
