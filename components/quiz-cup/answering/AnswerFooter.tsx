import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QUIZ_CUP_TACTICS, quizCupWagerLabel } from "@/constants/quiz-cup";

import { ChalkFrame } from "../QuizCupChalk";

type TacticInfo = (typeof QUIZ_CUP_TACTICS)[number];

type Props = {
  submitted: boolean;
  timeUp: boolean;
  submitting: boolean;
  hasChoice: boolean;
  wager: number;
  usedTactic: TacticInfo | undefined;
  onLock: () => void;
};

function lockButtonLabel(submitting: boolean, hasChoice: boolean) {
  if (submitting) return "กำลังส่ง...";
  return hasChoice ? "ล็อกคำตอบ" : "เลือกคำตอบก่อน";
}

export default function AnswerFooter({ submitted, timeUp, submitting, hasChoice, wager, usedTactic, onLock }: Props) {
  if (submitted) {
    return (
      <div className="relative rounded-3xl bg-black/65 px-4 py-4 text-center">
        <ChalkFrame className="rounded-3xl border-dashed border-white/50" />
        <p className="font-display subtitle relative">ส่งคำตอบแล้ว รอเพื่อนตอบให้ครบ</p>
        <p className="caption relative mt-1 text-neutral-300">
          เดิมพัน {quizCupWagerLabel(wager)}
          {usedTactic && ` · ใช้${usedTactic.label}`}
        </p>
      </div>
    );
  }

  if (timeUp) return <p className="font-display heading-5 text-center">หมดเวลา!</p>;

  return (
    <Button size="lg" className="w-full" disabled={!hasChoice || submitting} onClick={onLock}>
      {lockButtonLabel(submitting, hasChoice)}
      {hasChoice && !submitting && <ChevronRight data-icon="inline-end" />}
    </Button>
  );
}
