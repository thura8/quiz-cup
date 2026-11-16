/** Longest name a guest can type on the enter-room screen. */
export const GUEST_NAME_MAX = 20;

/** What EnterRoom hands back: a preset image, or a photo the player picked. */
export type SelectedAvatar =
  | { type: "preset"; src: string; bg: string }
  | { type: "upload"; src: string; file: File };
