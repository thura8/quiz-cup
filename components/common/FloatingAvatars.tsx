"use client";

import { CHAT_ICON } from "@/constants/chat";
import {
  useEmojiReactions,
  type GetEmojiReactions,
} from "@/hooks/shared/useEmojiReactions";
import { getMockEmojiReactions as getBalloonEmojiReactions } from "@/mock/emoji-reactions";
import type { EmojiReaction } from "@/types/room";
import { useEffect, useRef, useState } from "react";
import BalloonPlayerBubble, {
  type BubbleStatus,
} from "../balloon/BalloonPlayerBubble";

const MIN_VISIBLE = 5;
const MAX_VISIBLE = 10;
const ROTATE_INTERVAL_MS = 4000;
const REACTION_VISIBLE_MS = 1000;

const randomInt = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min + 1));

const randomPosition = () => ({
  top: `${(4 + Math.random() * 84).toFixed(1)}%`,
  left: `${(2 + Math.random() * 83).toFixed(1)}%`,
});

function hashIndex(id: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

type Bubble = {
  key: number;
  playerId: string;
  top: string;
  left: string;
  status: BubbleStatus;
  exitDirection?: "left" | "right";
  reactionEmoji?: number;
  reactionKey?: number;
};

const FLOAT_VARIANTS = [
  "animate-float-1",
  "animate-float-2",
  "animate-float-3",
  "animate-float-4",
];

const PLAYER_FLOATS = [
  { duration: "6.6s", delay: "-0.4s" },
  { duration: "7.4s", delay: "-2.8s" },
  { duration: "6.2s", delay: "-4.6s" },
  { duration: "8s", delay: "-1.9s" },
  { duration: "7s", delay: "-5.1s" },
  { duration: "6.8s", delay: "-3.3s" },
  { duration: "7.8s", delay: "-2.1s" },
  { duration: "6.4s", delay: "-0.6s" },
  { duration: "7.2s", delay: "-4.9s" },
  { duration: "8.2s", delay: "-1.5s" },
];

export type FloatingAvatarPlayer = {
  id: string;
  name: string;
  avatarSrc: string;
  avatarBg: string;
  borderColor: string;
};

type Props = {
  players: FloatingAvatarPlayer[];
  submittedPlayerIds?: string[];
  roomId?: string;
  hostToken?: string | null;
  getEmojiReactions?: GetEmojiReactions;
};

const FloatingAvatars = ({
  players,
  submittedPlayerIds = [],
  roomId,
  hostToken = null,
  getEmojiReactions = getBalloonEmojiReactions,
}: Props) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const nextKey = useRef(0);
  const nextReactionKey = useRef(0);
  const playersRef = useRef(players);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const handleReaction = (reaction: EmojiReaction) => {
    setBubbles((prev) => {
      const target = prev.find(
        (b) => b.playerId === reaction.playerId && b.status !== "leaving",
      );
      if (!target) return prev;

      const reactionKey = nextReactionKey.current++;

      window.setTimeout(() => {
        setBubbles((cur) =>
          cur.map((b) =>
            b.key === target.key && b.reactionKey === reactionKey
              ? { ...b, reactionEmoji: undefined, reactionKey: undefined }
              : b,
          ),
        );
      }, REACTION_VISIBLE_MS);

      return prev.map((b) =>
        b.key === target.key
          ? { ...b, reactionEmoji: reaction.emoji, reactionKey }
          : b,
      );
    });
  };

  useEmojiReactions(roomId ?? "", hostToken, handleReaction, getEmojiReactions);

  const spawnBubble = (
    pool: FloatingAvatarPlayer[],
    excludeIds: Set<string>,
    preferIds?: Set<string>,
  ): Bubble | null => {
    const available = pool.filter((p) => !excludeIds.has(p.id));
    if (available.length === 0) return null;
    const preferred = preferIds
      ? available.filter((p) => preferIds.has(p.id))
      : [];
    const candidates = preferred.length > 0 ? preferred : available;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    return {
      key: nextKey.current++,
      playerId: chosen.id,
      status: "entering",
      ...randomPosition(),
    };
  };

  const idsKey = players.map((p) => p.id).join(",");
  useEffect(() => {
    const currentIds = new Set(players.map((p) => p.id));
    const isFirstRun = seenIdsRef.current.size === 0;
    const newIds = new Set(
      players.filter((p) => !seenIdsRef.current.has(p.id)).map((p) => p.id),
    );
    players.forEach((p) => seenIdsRef.current.add(p.id));

    setBubbles((prev) => {
      const kept = prev.filter((b) => currentIds.has(b.playerId));
      const count = players.length;
      const maxVisible = Math.min(MAX_VISIBLE, count);
      const minVisible = Math.min(MIN_VISIBLE, count);
      const next = [...kept];
      const shownIds = () =>
        new Set(
          next.filter((b) => b.status !== "leaving").map((b) => b.playerId),
        );

      if (isFirstRun) {
        const initialCount = randomInt(minVisible, maxVisible);
        while (shownIds().size < initialCount) {
          const bubble = spawnBubble(players, shownIds());
          if (!bubble) break;
          next.push(bubble);
        }
        return next;
      }

      for (const id of newIds) {
        if (shownIds().size >= maxVisible) break;
        if (shownIds().has(id)) continue;
        const bubble = spawnBubble(players, shownIds(), new Set([id]));
        if (!bubble) break;
        next.push(bubble);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) => {
        const pool = playersRef.current;
        const count = pool.length;
        const maxVisible = Math.min(MAX_VISIBLE, count);
        const minVisible = Math.min(MIN_VISIBLE, count);
        const alive = prev.filter((b) => b.status !== "leaving");
        const shownIds = new Set(alive.map((b) => b.playerId));
        const canAdd = alive.length < maxVisible;
        const canRemove = alive.length > minVisible;

        const actions = [
          ...(canAdd ? (["add"] as const) : []),
          ...(canRemove ? (["remove"] as const) : []),
        ];
        if (actions.length === 0) return prev;
        const action = actions[Math.floor(Math.random() * actions.length)];

        if (action === "add") {
          const bubble = spawnBubble(pool, shownIds);
          return bubble ? [...prev, bubble] : prev;
        }

        const target = alive[Math.floor(Math.random() * alive.length)];
        const exitDirection = parseFloat(target.left) < 50 ? "left" : "right";

        return prev.map((b) =>
          b.key === target.key
            ? { ...b, status: "leaving" as const, exitDirection }
            : b,
        );
      });
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleEntered = (key: number) => {
    setBubbles((prev) =>
      prev.map((b) =>
        b.key === key && b.status === "entering"
          ? { ...b, status: "visible" }
          : b,
      ),
    );
  };

  const handleExited = (key: number) => {
    setBubbles((prev) => prev.filter((b) => b.key !== key));
  };

  const submittedIds = new Set(submittedPlayerIds);

  return (
    <div className="pointer-events-none absolute inset-0 -z-1">
      {bubbles.map((bubble) => {
        const player = players.find((p) => p.id === bubble.playerId);
        if (!player) return null;
        const float =
          PLAYER_FLOATS[hashIndex(bubble.playerId, PLAYER_FLOATS.length)];
        const floatVariant =
          FLOAT_VARIANTS[hashIndex(bubble.playerId, FLOAT_VARIANTS.length)];
        const reactionIconSrc = bubble.reactionEmoji
          ? CHAT_ICON[bubble.reactionEmoji - 1]?.image
          : undefined;

        return (
          <BalloonPlayerBubble
            key={bubble.key}
            name={player.name}
            avatarSrc={player.avatarSrc}
            avatarBg={player.avatarBg}
            borderColor={player.borderColor}
            top={bubble.top}
            left={bubble.left}
            status={bubble.status}
            exitDirection={bubble.exitDirection}
            floatClassName={floatVariant}
            floatDuration={float.duration}
            floatDelay={float.delay}
            editable={submittedIds.has(bubble.playerId)}
            reactionIconSrc={reactionIconSrc}
            onEntered={() => handleEntered(bubble.key)}
            onExited={() => handleExited(bubble.key)}
          />
        );
      })}
    </div>
  );
};

export default FloatingAvatars;
