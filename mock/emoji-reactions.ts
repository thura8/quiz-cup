import { CHAT_ICON } from "@/constants/chat";
import type { EmojiReaction } from "@/types/room";
import { MOCK_BOT_NAMES } from "./players";

let counter = 0;

export async function getMockEmojiReactions(
  _roomId: string,
  _hostToken: string,
  after?: string,
): Promise<{ reactions: EmojiReaction[]; cursor: string }> {
  void _roomId;
  void _hostToken;
  const reactions: EmojiReaction[] = [];
  if (after && Math.random() < 0.35) {
    const i = Math.floor(Math.random() * 4);
    counter += 1;
    reactions.push({
      id: `r${counter}`,
      playerId: `bot-${i + 1}`,
      name: MOCK_BOT_NAMES[i],
      avatar: null,
      emoji: Math.floor(Math.random() * CHAT_ICON.length),
      sentAt: new Date().toISOString(),
    });
  }
  return { reactions, cursor: String(counter) };
}
