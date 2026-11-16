"use client";

import type { EmojiReaction } from "@/types/room";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 1000;

export type GetEmojiReactions = (
  roomId: string,
  hostToken: string,
  after?: string,
) => Promise<{ reactions: EmojiReaction[]; cursor: string }>;

export function useEmojiReactions(
  roomId: string,
  hostToken: string | null,
  onReaction: (reaction: EmojiReaction) => void,
  getEmojiReactions: GetEmojiReactions,
): void {
  const onReactionRef = useRef(onReaction);

  useEffect(() => {
    onReactionRef.current = onReaction;
  }, [onReaction]);

  useEffect(() => {
    if (!hostToken) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let cursor: string | undefined;

    async function poll() {
      try {
        const { reactions, cursor: nextCursor } = await getEmojiReactions(
          roomId,
          hostToken as string,
          cursor,
        );
        if (cancelled) return;
        cursor = nextCursor;
        for (const reaction of reactions) {
          onReactionRef.current(reaction);
        }
      } catch {
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roomId, hostToken, getEmojiReactions]);
}
