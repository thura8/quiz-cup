import { Check, Lock, X } from "lucide-react";
import type { ReactNode } from "react";

import AppDrawer from "@/components/common/AppDrawer";
import { Button } from "@/components/ui/button";
import { QUIZ_CUP_TACTICS, quizCupWagerLabel } from "@/constants/quiz-cup";

import { CHOICE_COLORS, CHOICE_LETTERS } from "../QuizCupChalk";

type TacticInfo = (typeof QUIZ_CUP_TACTICS)[number];

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <dt className="body-2 w-20 shrink-0 text-neutral-300">{label}</dt>
      <dd className="body-1 font-semibold">{children}</dd>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  choice: number | null;
  choices: string[];
  wager: number;
  usedTactic: TacticInfo | undefined;
  outcome: { ifRight: number; ifWrong: number };
};

function AnswerSummary({ choice, choices, wager, usedTactic, outcome }: Omit<Props, "open" | "onOpenChange" | "onConfirm"> & { choice: number }) {
  return (
    <div className="text-white">
      <dl className="divide-y divide-dashed divide-white/20 border-y border-dashed border-white/20">
        <SummaryRow label="คำตอบ">
          <span className={CHOICE_COLORS[choice].text}>{CHOICE_LETTERS[choice]}</span> {choices[choice]}
        </SummaryRow>
        <SummaryRow label="เดิมพัน">{quizCupWagerLabel(wager)}</SummaryRow>
        <SummaryRow label="Tactic">
          {usedTactic ? (
            <>
              {usedTactic.label}
              <span className="body-2 ml-2 font-normal text-neutral-300">−{usedTactic.cost} Energy</span>
            </>
          ) : (
            "ไม่ใช้"
          )}
        </SummaryRow>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <p className="body-2 flex items-center justify-center gap-1.5 rounded-2xl bg-green-500/15 py-3 text-green-300">
          <Check className="size-4" />
          ถูก +{outcome.ifRight}
        </p>
        <p className="body-2 text-primary-300 bg-primary/15 flex items-center justify-center gap-1.5 rounded-2xl py-3">
          <X className="size-4" />
          ผิด −{outcome.ifWrong}
        </p>
      </div>
      <p className="caption mt-3 text-neutral-300">ยืนยันแล้วเปลี่ยนคำตอบไม่ได้</p>
    </div>
  );
}

export default function ConfirmAnswerDrawer({ open, onOpenChange, onConfirm, choice, ...summary }: Props) {
  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      className="border-none bg-[#2B2B2BE5] backdrop-blur-[2px]"
      title={
        <span className="flex flex-col gap-1">
          <span className="caption text-highlight-yellow inline-flex items-center gap-1.5">
            <Lock className="size-3.5" />
            ยืนยันครั้งสุดท้าย
          </span>
          <span className="font-display heading-4">ล็อกคำตอบนี้เลยไหม?</span>
        </span>
      }
      titleClassName="text-white text-left"
      footer={
        <>
          <Button
            variant="outline"
            size="default"
            className="h-12 flex-1 bg-transparent px-4 text-white!"
            onClick={() => onOpenChange(false)}
          >
            กลับไปแก้
          </Button>
          <Button className="h-12 flex-1 px-4" onClick={onConfirm}>
            ยืนยันคำตอบ
          </Button>
        </>
      }
    >
      {choice != null && <AnswerSummary choice={choice} {...summary} />}
    </AppDrawer>
  );
}
