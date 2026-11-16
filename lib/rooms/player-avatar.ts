import { AVATAR_COLORS } from "@/constants/avatar";
import type { FloatingAvatarPlayer } from "@/components/common/FloatingAvatars";
import type { PlayerDirectory, RoomPlayer } from "@/types/room";

function hashToIndex(id: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

// The backend stores system presets as "/avatar-xxx.png"; the files live in public/avatar/.
function resolvePresetSrc(avatar: string | null): string | null {
  if (!avatar) return null;
  return /^\/avatar-[a-z]+\.png$/.test(avatar) ? `/avatar${avatar}` : avatar;
}

export function toFloatingAvatarPlayer(player: RoomPlayer): FloatingAvatarPlayer {
  const avatarSrc = resolvePresetSrc(player.avatar);
  const preset = AVATAR_COLORS.find((item) => item.avatarSrc === avatarSrc);
  const fallback =
    preset ?? AVATAR_COLORS[hashToIndex(player.id, AVATAR_COLORS.length)];
  return {
    id: player.id,
    name: player.name,
    avatarSrc: avatarSrc ?? fallback.avatarSrc,
    avatarBg: player.bgColor ?? fallback.avatarBg,
    borderColor: player.border ?? fallback.borderColor,
  };
}

export function toFloatingAvatarPlayers(players: RoomPlayer[]): FloatingAvatarPlayer[] {
  return players.map(toFloatingAvatarPlayer);
}

export function resolveDirectoryAvatar(
  directory: PlayerDirectory,
  playerId: string,
  fallbackName: string,
): FloatingAvatarPlayer {
  const entry = directory[playerId];
  return toFloatingAvatarPlayer({
    id: playerId,
    name: entry?.name ?? fallbackName,
    avatar: entry?.avatar ?? null,
    border: entry?.border ?? null,
    bgColor: entry?.bgColor ?? null,
    connected: true,
  });
}
