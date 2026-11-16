"use client";

import { ChevronLeft, Globe } from "lucide-react";
import { useState } from "react";

import SoundToggle from "@/components/common/SoundToggle";
import { Button } from "@/components/ui/button";
import { QUIZ_CUP_DEFAULT_SETTINGS } from "@/constants/quiz-cup";
import type { QuizCupCategoryId, QuizCupSettings } from "@/types/quiz-cup";

import QuizCupBackground from "./QuizCupBackground";
import GameRulesBoard from "./settings/GameRulesBoard";
import MoreSettingsBoard from "./settings/MoreSettingsBoard";
import QuestionSourceBoard from "./settings/QuestionSourceBoard";
import SettingsSummary from "./settings/SettingsSummary";
import type { UpdateSetting } from "./settings/types";

type Props = {
  defaultSettings?: QuizCupSettings;
  submitting?: boolean;
  onSubmit?: (settings: QuizCupSettings) => void;
  onBack?: () => void;
};

function SettingsNav({ onBack }: { onBack?: () => void }) {
  return (
    <nav className="relative z-20 container mx-auto flex items-center justify-between p-4">
      <Button variant="outline" className="bg-transparent px-6 text-white!" onClick={onBack}>
        <ChevronLeft className="size-4" />
        กลับ
      </Button>

      <div className="inline-flex items-center gap-2">
        <SoundToggle size="default" />
        <Button variant="outline" className="bg-transparent px-6 text-white!">
          TH
          <Globe className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

const QuizCupSetting = ({
  defaultSettings = QUIZ_CUP_DEFAULT_SETTINGS,
  submitting = false,
  onSubmit,
  onBack,
}: Props) => {
  const [settings, setSettings] = useState<QuizCupSettings>(defaultSettings);

  const update: UpdateSetting = (key, value) => setSettings((previous) => ({ ...previous, [key]: value }));

  const toggleCategory = (id: QuizCupCategoryId) =>
    setSettings((previous) => ({
      ...previous,
      categories: previous.categories.includes(id)
        ? previous.categories.filter((category) => category !== id)
        : [...previous.categories, id],
    }));

  const needsCategory = settings.source === "custom" && settings.categories.length === 0;

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-white">
      <QuizCupBackground />
      <SettingsNav onBack={onBack} />

      <div className="relative z-10 mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-6 overflow-y-auto px-4 pb-4 sm:px-8 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
        <div className="flex flex-col gap-6 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
          <QuestionSourceBoard settings={settings} update={update} onToggleCategory={toggleCategory} />
          <GameRulesBoard settings={settings} update={update} />
          <MoreSettingsBoard settings={settings} update={update} />
        </div>

        <SettingsSummary
          settings={settings}
          needsCategory={needsCategory}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
};

export default QuizCupSetting;
