"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import * as THREE from "three";

import { buildMascot } from "@/components/quiz-cup/arena/mascot/build-mascot";
import { HOST_POSES } from "@/components/quiz-cup/arena/mascot/mascot-spec";
import { cn } from "@/lib/utils";

import { type ConceptArt, VIEW_NAMES, loadConceptArt } from "./concept-art";
import { createPainter, traceHead } from "./head-trace";
import { EXPORT_FILE_NAME, downloadGlb, exportMascotGlb, parseGlb, saveToArena } from "./export-glb";
import MascotStage, {
  type CameraView,
  type Framing,
  type MascotPose,
  type OverlayMode,
  type Readout,
} from "./MascotStage";

const ART_URL = "/concept/host-turnaround.jpeg";
const VIEWS: CameraView[] = ["free", ...VIEW_NAMES];
const POSES: MascotPose[] = ["rest", ...(Object.keys(HOST_POSES) as MascotPose[])];
const OVERLAYS: OverlayMode[] = ["off", "under", "over"];
const FRAMINGS: Framing[] = ["body", "head"];

type Source = "built" | "exported";

const subscribeNever = () => () => {};

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      (material as THREE.MeshStandardMaterial).map?.dispose();
      material.dispose();
    });
  });
}

function pick<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]) {
  const value = params.get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 text-xs text-white/50">{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs transition-colors",
            option === value ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function MascotLab() {
  const [art, setArt] = useState<ConceptArt | null>(null);
  const [message, setMessage] = useState("Loading concept art…");
  const [view, setView] = useState<CameraView>("free");
  const [pose, setPose] = useState<MascotPose>("idle");
  const [overlay, setOverlay] = useState<OverlayMode>("over");
  const [framing, setFraming] = useState<Framing>("body");
  const [freeCamera, setFreeCamera] = useState<[number, number, number] | null>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [toon, setToonEnabled] = useState(true);
  const [outlines, setOutlinesEnabled] = useState(true);
  const [source, setSource] = useState<Source>("built");
  const [exported, setExported] = useState<THREE.Group | null>(null);
  const [readout, setReadout] = useState<Readout | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL so views can be linked/screenshotted */
    setView((current) => pick(params, "view", VIEWS) ?? current);
    setPose((current) => pick(params, "pose", POSES) ?? current);
    setOverlay((current) => pick(params, "overlay", OVERLAYS) ?? current);
    setFraming((current) => pick(params, "frame", FRAMINGS) ?? current);
    const cam = params.get("cam")?.split(",").map(Number);
    if (cam?.length === 3 && cam.every(Number.isFinite)) setFreeCamera(cam as [number, number, number]);
    const opacityParam = Number(params.get("opacity"));
    if (params.has("opacity") && opacityParam >= 0 && opacityParam <= 1) setOpacity(opacityParam);
    if (params.get("toon") === "0") setToonEnabled(false);
    if (params.get("outlines") === "0") setOutlinesEnabled(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    let cancelled = false;
    loadConceptArt(ART_URL)
      .then((loaded) => {
        if (cancelled) return;
        setArt(loaded);
        setMessage("");
      })
      .catch((error: Error) => !cancelled && setMessage(error.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const traced = useMemo(() => {
    if (!art) return { head: null, paint: null, error: "" };
    try {
      const head = traceHead(art);
      return { head, paint: createPainter(art, head), error: "" };
    } catch (error) {
      return { head: null, paint: createPainter(art, null), error: (error as Error).message };
    }
  }, [art]);
  const isClient = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const built = useMemo(
    () => (isClient ? buildMascot({ head: traced.head, paint: traced.paint }) : null),
    [isClient, traced],
  );
  useEffect(() => () => built?.dispose(), [built]);
  useEffect(() => () => void (exported && disposeObject(exported)), [exported]);

  const model = source === "exported" && exported ? exported : built?.root;

  const exportGlb = useCallback(
    async (download: boolean) => {
      try {
        setMessage("Exporting…");
        const buffer = await exportMascotGlb({ head: traced.head, paint: traced.paint });
        if (download) downloadGlb(buffer);
        const saved = await saveToArena(buffer);
        setExported(await parseGlb(buffer));
        setSource("exported");
        setMessage(
          `Saved ${saved.path} (${Math.round(saved.bytes / 1024)} KB)` +
            (download ? ` and downloaded ${EXPORT_FILE_NAME}` : "") +
            ", now showing the re-imported file",
        );
        document.title = "mascot-exported";
      } catch (error) {
        setMessage(`Export failed: ${(error as Error).message}`);
        document.title = "mascot-export-failed";
      }
    },
    [traced],
  );

  useEffect(() => {
    if (!art || !traced.head) return;
    if (new URLSearchParams(window.location.search).get("export") !== "1") return;
    const timer = setTimeout(() => void exportGlb(false));
    return () => clearTimeout(timer);
  }, [art, traced, exportGlb]);

  const lateralAxis = view === "right" || view === "left" ? "z" : "x";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#1d2033]">
      <div className="absolute inset-0">
        {model && (
          <MascotStage
            model={model}
            art={art}
            view={view}
            framing={framing}
            freeCamera={freeCamera}
            pose={pose}
            overlay={overlay}
            opacity={opacity}
            toon={toon}
            outlines={outlines}
            onReadout={setReadout}
          />
        )}
      </div>

      <div className="absolute top-4 left-4 flex max-w-[calc(100%-2rem)] flex-col gap-2 rounded-2xl bg-black/50 p-3 backdrop-blur">
        <Choice label="View" options={VIEWS} value={view} onChange={setView} />
        <Choice label="Frame" options={FRAMINGS} value={framing} onChange={setFraming} />
        <Choice label="Pose" options={POSES} value={pose} onChange={setPose} />
        <Choice label="Concept" options={OVERLAYS} value={overlay} onChange={setOverlay} />
        <label className="flex items-center gap-1.5 text-xs text-white/50">
          <span className="w-16">Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
          />
        </label>
        <Choice
          label="Shading"
          options={["toon", "pbr"] as const}
          value={toon ? "toon" : "pbr"}
          onChange={(v) => setToonEnabled(v === "toon")}
        />
        <Choice
          label="Outline"
          options={["on", "off"] as const}
          value={outlines ? "on" : "off"}
          onChange={(v) => setOutlinesEnabled(v === "on")}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-xs text-white/50">Source</span>
          {(["built", "exported"] as const).map((option) => (
            <button
              key={option}
              type="button"
              disabled={option === "exported" && !exported}
              onClick={() => setSource(option)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs transition-colors disabled:opacity-30",
                option === source ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
              )}
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void exportGlb(true)}
            className="ml-2 rounded-full bg-violet-500 px-3 py-0.5 text-xs text-white hover:bg-violet-400"
          >
            Export GLB to stage
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 space-y-1 font-mono text-xs text-white/70">
        {(message || traced.error) && <p>{message || traced.error}</p>}
        {view !== "free" && overlay !== "off" && (
          <p>
            {readout
              ? `${lateralAxis} ${readout.lateral.toFixed(3)} m · y ${readout.y.toFixed(3)} m` +
                (readout.span ? ` · width ${(readout.span[1] - readout.span[0]).toFixed(3)} m` : "") +
                " · click to copy"
              : "Hover the concept art to read positions in meters"}
          </p>
        )}
      </div>
    </div>
  );
}
