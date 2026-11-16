export const GUEST_NAME_MAX = 20;

export type SelectedAvatar =
  | { type: "preset"; src: string; bg: string }
  | { type: "upload"; src: string; file: File };
