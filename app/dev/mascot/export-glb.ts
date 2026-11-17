import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { type MascotOptions, buildMascot } from "@/components/quiz-cup/arena/mascot/build-mascot";

export async function exportMascotGlb(options: MascotOptions) {
  const { root, dispose } = buildMascot(options);
  try {
    return (await new GLTFExporter().parseAsync(root, {
      binary: true,
    })) as ArrayBuffer;
  } finally {
    dispose();
  }
}

export function downloadGlb(buffer: ArrayBuffer, fileName: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseGlb(buffer: ArrayBuffer) {
  return new Promise<THREE.Group>((resolve, reject) =>
    new GLTFLoader().parse(buffer, "", (gltf) => resolve(gltf.scene), reject),
  );
}

export async function saveToArena(buffer: ArrayBuffer, character: string) {
  const response = await fetch(`/dev/mascot/save?character=${encodeURIComponent(character)}`, {
    method: "POST",
    body: buffer,
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as { path: string; bytes: number };
}
