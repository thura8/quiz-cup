"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { type CastScene, createCastScene } from "./cast-scene";
import { CAST_STATES, type CastState } from "./cast-states";
import { loadImage } from "./sprite-sheet";

const DEFAULT_SHEET_URL = "/quiz-cup/cast/alex-emotes.jpg";
const LOADING_MESSAGE = "Loading sprite sheet…";

function StateButtons({ selected, onSelect }: { selected: CastState; onSelect: (state: CastState) => void }) {
  return (
    <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-2">
      {CAST_STATES.map((state) => (
        <button
          key={state.id}
          onClick={() => onSelect(state.id)}
          className={cn(
            "rounded-full px-3 py-1 text-sm transition-colors",
            selected === state.id ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
          )}
        >
          {state.label}
        </button>
      ))}
    </div>
  );
}

function SheetLoader({ status, onFile }: { status: string; onFile: (file: File | undefined) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute right-4 bottom-4 flex items-center gap-3">
      {status && <span className="text-sm text-white/60">{status}</span>}
      <button
        onClick={() => fileInput.current?.click()}
        className="rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
      >
        Load custom sprite sheet
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export default function CastShowcase() {
  const container = useRef<HTMLDivElement>(null);
  const castScene = useRef<CastScene | null>(null);
  const [state, setState] = useState<CastState>("idle");
  const [status, setStatus] = useState(LOADING_MESSAGE);

  useEffect(() => {
    const scene = createCastScene(container.current!);
    castScene.current = scene;

    loadImage(DEFAULT_SHEET_URL)
      .then((image) => {
        scene.setSheet(image);
        setStatus("");
      })
      .catch((error: Error) => setStatus(error.message));

    return () => {
      scene.dispose();
      castScene.current = null;
    };
  }, []);

  const selectState = (nextState: CastState) => {
    setState(nextState);
    castScene.current?.setState(nextState);
  };

  const loadCustomSheet = async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      setStatus(LOADING_MESSAGE);
      castScene.current?.setSheet(await loadImage(url));
      setStatus("");
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: "#14182e" }}>
      <div ref={container} className="absolute inset-0" />
      <StateButtons selected={state} onSelect={selectState} />
      <SheetLoader status={status} onFile={(file) => void loadCustomSheet(file)} />
    </div>
  );
}
