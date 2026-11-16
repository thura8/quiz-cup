"use client";

import AppDrawer from "@/components/common/AppDrawer";
import EnterRoom from "@/components/common/EnterRoom";
import GameEndGame from "@/components/common/GameEndGame";
import GameWaitingRoom from "@/components/common/GameWaitingRoom";
import JoinRoom from "@/components/common/JoinRoom";
import QuizCupAnswering, {
  type QuizCupAnswer,
} from "@/components/quiz-cup/QuizCupAnswering";
import QuizCupAnswerResult from "@/components/quiz-cup/QuizCupAnswerResult";
import QuizCupBackground from "@/components/quiz-cup/QuizCupBackground";
import QuizCupPlayerSummary from "@/components/quiz-cup/QuizCupPlayerSummary";
import QuizCupRoundIntro from "@/components/quiz-cup/QuizCupRoundIntro";
import QuizCupSetting from "@/components/quiz-cup/QuizCupSetting";
import { Button } from "@/components/ui/button";
import { quizCupStartingEnergy } from "@/constants/quiz-cup";
import {
  toFloatingAvatarPlayer,
  toFloatingAvatarPlayers,
} from "@/lib/rooms/player-avatar";
import { cn } from "@/lib/utils";
import type { QuizCupQuestionResult } from "@/types/quiz-cup";
import type {
  LeaderboardEntry,
  PlayerDirectory,
  RoomPlayer,
} from "@/types/room";
import { ListVideo, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import MockHostStage from "./MockHostStage";

type MockStep =
  | "join"
  | "settings"
  | "enter_room"
  | "waiting_room"
  | "tutorial"
  | "prepare"
  | "playing"
  | "round_intro"
  | "answer_playing"
  | "answer_result"
  | "answer_result_wrong"
  | "answer_result_missed"
  | "player_summary"
  | "end_round"
  | "end_game"
  | "loading"
  | "background";

const STEPS: { id: MockStep; label: string }[] = [
  { id: "join", label: "Join (Host)" },
  { id: "settings", label: "Settings" },
  { id: "enter_room", label: "Enter Room" },
  { id: "waiting_room", label: "Waiting Room" },
  { id: "tutorial", label: "Tutorial" },
  { id: "prepare", label: "Prepare" },
  { id: "playing", label: "Playing (Host)" },
  { id: "round_intro", label: "Answer · Round intro" },
  { id: "answer_playing", label: "Answer · Playing" },
  { id: "answer_result", label: "Answer · Result (ถูก)" },
  { id: "answer_result_wrong", label: "Answer · Result (ผิด)" },
  { id: "answer_result_missed", label: "Answer · Result (ไม่ได้ตอบ)" },
  { id: "player_summary", label: "Answer · Summary" },
  { id: "end_round", label: "End Round" },
  { id: "end_game", label: "End Game" },
  { id: "loading", label: "Loading" },
  { id: "background", label: "Background" },
];

const STEP_IDS = new Set<string>(STEPS.map((s) => s.id));

function isMockStep(value: string | null): value is MockStep {
  return value != null && STEP_IDS.has(value);
}

const MOCK_PLAYERS: RoomPlayer[] = [
  {
    id: "p1",
    name: "แนน",
    avatar: "/avatar/avatar-red.png",
    border: "#FB623D",
    bgColor: "#F14343",
    connected: true,
  },
  {
    id: "p2",
    name: "โบว์",
    avatar: "/avatar/avatar-red.png",
    border: "#3D6FFB",
    bgColor: "#4390F1",
    connected: true,
  },
  {
    id: "p3",
    name: "ก้อง",
    avatar: "/avatar/avatar-red.png",
    border: "#FB3DC0",
    bgColor: "#F1439E",
    connected: true,
  },
  {
    id: "p4",
    name: "มายด์",
    avatar: "/avatar/avatar-red.png",
    border: "#FBC53D",
    bgColor: "#F1D343",
    connected: false,
  },
];

const MOCK_PLAYER_DIRECTORY: PlayerDirectory = Object.fromEntries(
  MOCK_PLAYERS.map((p) => [
    p.id,
    { name: p.name, avatar: p.avatar, border: p.border, bgColor: p.bgColor },
  ]),
);

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, playerId: "p2", name: "โบว์", totalScore: 1480 },
  { rank: 2, playerId: "p1", name: "แนน", totalScore: 1300 },
  { rank: 3, playerId: "p4", name: "มายด์", totalScore: 1120 },
  { rank: 4, playerId: "p3", name: "ก้อง", totalScore: 860 },
];

async function noop() {}

function futureIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

const MOCK_QUESTION_COUNT = 20;
const MOCK_SECONDS_PER_QUESTION = 20;
const MOCK_ENERGY = quizCupStartingEnergy(MOCK_QUESTION_COUNT);
const MOCK_SELF = toFloatingAvatarPlayer(MOCK_PLAYERS[0]);
const MOCK_QUESTION = "พหูพจน์ของคำว่า child คือข้อใด";
const MOCK_CHOICES = ["childs", "children", "childes", "childrens"];

const MOCK_RESULTS: QuizCupQuestionResult[] = Array.from(
  { length: MOCK_QUESTION_COUNT },
  (_, i) => ({
    correct: i === 6 ? null : i % 4 !== 3,
    wager: [0, 10, 20][i % 3],
    tactic: i === 2 ? "double" : i === 7 ? "shield" : i === 11 ? "fifty" : null,
  }),
);

function MockAnswerResult({
  answer,
  previousRank,
}: {
  answer: QuizCupAnswer | null;
  previousRank: number;
}) {
  return (
    <QuizCupAnswerResult
      round={3}
      totalRounds={MOCK_QUESTION_COUNT}
      question={MOCK_QUESTION}
      choices={MOCK_CHOICES}
      correctChoice={1}
      answer={answer}
      selfName={MOCK_SELF.name}
      selfAvatarSrc={MOCK_SELF.avatarSrc}
      selfAvatarBg={MOCK_SELF.avatarBg}
      score={1300}
      rank={2}
      previousRank={previousRank}
    />
  );
}

function MockAnswering() {
  const [roundEndsAt] = useState(() => futureIso(MOCK_SECONDS_PER_QUESTION));
  const [hiddenChoices, setHiddenChoices] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState<QuizCupAnswer | null>(null);

  return (
    <QuizCupAnswering
      round={3}
      totalRounds={MOCK_QUESTION_COUNT}
      question="พหูพจน์ของคำว่า child คือข้อใด"
      choices={["childs", "children", "childes", "childrens"]}
      roundEndsAt={roundEndsAt}
      durationSeconds={MOCK_SECONDS_PER_QUESTION}
      selfName={MOCK_SELF.name}
      selfAvatarSrc={MOCK_SELF.avatarSrc}
      selfAvatarBg={MOCK_SELF.avatarBg}
      score={1240}
      rank={2}
      maxEnergy={MOCK_ENERGY}
      energy={MOCK_ENERGY - 1}
      hiddenChoices={hiddenChoices}
      onUseFifty={() => setHiddenChoices([0, 2])}
      submitted={submitted}
      onSubmit={setSubmitted}
    />
  );
}

const QuizCupMockPageInner = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stepParam = searchParams.get("step");
  const [step, setStep] = useState<MockStep>(
    isMockStep(stepParam) ? stepParam : "join",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  function goToStep(id: MockStep) {
    setStep(id);
    router.replace(`${pathname}?step=${id}`, { scroll: false });
  }

  const floatingPlayers = toFloatingAvatarPlayers(MOCK_PLAYERS);
  function renderScreen() {
    switch (step) {
      case "join":
        return (
          <JoinRoom
            logoSrc="/quiz-cup/logo.png"
            backgroundImage="/quiz-cup/bg.png"
            roomCode="TH1234"
            players={floatingPlayers}
            onStart={noop}
          />
        );
      case "settings":
        return <QuizCupSetting />;
      case "enter_room":
        return (
          <EnterRoom
            logoSrc="/quiz-cup/logo.png"
            backgroundImage="/quiz-cup/bg.png"
            roomCode="TH1234"
          />
        );
      case "waiting_room":
        return (
          <GameWaitingRoom
            background={<QuizCupBackground />}
            logoSrc="/quiz-cup/logo.png"
            playerName={MOCK_SELF.name}
            avatarSrc={MOCK_SELF.avatarSrc}
            avatarBg={MOCK_SELF.avatarBg}
            avatarBorder={MOCK_SELF.borderColor}
            players={floatingPlayers}
            onUploadAvatar={noop}
            onSelectSystemAvatar={noop}
            onSendEmoji={noop}
          />
        );
      case "round_intro":
        return (
          <QuizCupRoundIntro
            round={3}
            totalRounds={MOCK_QUESTION_COUNT}
            category="english"
            difficulty="easy"
            startsAt={futureIso(3)}
            selfName={MOCK_SELF.name}
            selfAvatarSrc={MOCK_SELF.avatarSrc}
            selfAvatarBg={MOCK_SELF.avatarBg}
            score={1240}
            rank={2}
            energy={MOCK_ENERGY}
          />
        );
      case "answer_playing":
        return <MockAnswering />;
      case "answer_result":
        return (
          <MockAnswerResult
            answer={{ choice: 1, wager: 20, tactic: "double" }}
            previousRank={3}
          />
        );
      case "answer_result_wrong":
        return (
          <MockAnswerResult
            answer={{ choice: 3, wager: 20, tactic: null }}
            previousRank={1}
          />
        );
      case "answer_result_missed":
        return <MockAnswerResult answer={null} previousRank={2} />;
      case "player_summary":
        return (
          <QuizCupPlayerSummary
            selfName={MOCK_SELF.name}
            selfAvatarSrc={MOCK_SELF.avatarSrc}
            selfAvatarBg={MOCK_SELF.avatarBg}
            rank={2}
            totalPlayers={MOCK_PLAYERS.length}
            score={1480}
            results={MOCK_RESULTS}
            onDone={noop}
          />
        );
      case "playing":
        return <MockHostStage onFinish={() => goToStep("end_game")} />;
      case "tutorial":
      case "prepare":
      case "end_game":
        return (
          <GameEndGame
            background={<QuizCupBackground />}
            logoSrc="/quiz-cup/logo.png"
            leaderboard={MOCK_LEADERBOARD}
            playerDirectory={MOCK_PLAYER_DIRECTORY}
            role="host"
            onCloseRoom={noop}
          />
        );
      case "end_round":
      case "loading":
      case "background":
        return <StepPlaceholder step={step} />;
      default:
        return null;
    }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div key={resetKey} className="h-dvh w-full">
        {renderScreen()}
      </div>

      <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-2">
        <Button
          size="icon"
          className="size-12 rounded-full shadow-lg"
          aria-label="เล่นแอนิเมชันใหม่"
          onClick={() => setResetKey((k) => k + 1)}
        >
          <RefreshCw className="size-5" />
        </Button>
        <AppDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          trigger={
            <Button
              size="icon"
              className="size-12 rounded-full shadow-lg"
              aria-label="เลือกหน้าจอตัวอย่าง"
            >
              <ListVideo className="size-5" />
            </Button>
          }
          title="เลือกหน้าจอตัวอย่าง"
          closable
          className="rounded-t-3xl border-none bg-[#1c1c1c] [--drawer-inset:0px]"
        >
          <div className="flex flex-wrap gap-2 pb-2">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  goToStep(s.id);
                  setDrawerOpen(false);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                  step === s.id
                    ? "bg-white text-black"
                    : "bg-white/10 text-white",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </AppDrawer>
      </div>
    </div>
  );
};

function StepPlaceholder({ step }: { step: MockStep }) {
  const label = STEPS.find((s) => s.id === step)?.label ?? step;
  return (
    <div className="flex h-dvh w-full items-center justify-center text-white/60">
      {label}
    </div>
  );
}

const QuizCupMockPage = () => (
  <Suspense fallback={null}>
    <QuizCupMockPageInner />
  </Suspense>
);

export default QuizCupMockPage;
