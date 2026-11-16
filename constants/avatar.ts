import type { SystemAvatarId } from "@/types/room";

export const AVATAR_COLORS = [
  {
    avatarSrc: "/avatar/avatar-red.png",
    avatarBg: "#F14343",
    borderColor: "#FB623D",
  },
  {
    avatarSrc: "/avatar/avatar-blue.png",
    avatarBg: "#4390F1",
    borderColor: "#3D6FFB",
  },
  {
    avatarSrc: "/avatar/avatar-pink.png",
    avatarBg: "#F1439E",
    borderColor: "#FB3DC0",
  },
  {
    avatarSrc: "/avatar/avatar-yellow.png",
    avatarBg: "#F1D343",
    borderColor: "#FBC53D",
  },
  {
    avatarSrc: "/avatar/avatar-black.png",
    avatarBg: "#4A4A4A",
    borderColor: "#FBC53D",
  },
];

export const SYSTEM_AVATAR_IDS: SystemAvatarId[] = [
  "avatar-black",
  "avatar-blue",
  "avatar-pink",
  "avatar-red",
  "avatar-yellow",
];
