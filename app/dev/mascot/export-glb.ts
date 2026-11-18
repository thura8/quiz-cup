import { PropertyType, WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { type MascotOptions, buildMascot } from "@/components/quiz-cup/arena/mascot/build-mascot";

const WEBP = "image/webp";

function exportTexturesAsWebp(root: THREE.Object3D) {
  root.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!material || Array.isArray(material)) return;
    for (const texture of [material.map, material.emissiveMap]) {
      if (texture && (texture as THREE.CanvasTexture).isCanvasTexture) texture.userData.mimeType = WEBP;
    }
  });
}

async function compressGlb(buffer: ArrayBuffer) {
  await MeshoptEncoder.ready;
  const io = new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  const document = await io.readBinary(new Uint8Array(buffer));
  await document.transform(
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.TEXTURE] }),
    weld(),
    meshopt({ encoder: MeshoptEncoder }),
  );
  const compressed = await io.writeBinary(document);
  return compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer;
}

export async function exportMascotGlb(options: MascotOptions) {
  const { root, dispose } = buildMascot(options);
  try {
    exportTexturesAsWebp(root);
    const raw = (await new GLTFExporter().parseAsync(root, { binary: true })) as ArrayBuffer;
    return await compressGlb(raw);
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
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise<THREE.Group>((resolve, reject) => loader.parse(buffer, "", (gltf) => resolve(gltf.scene), reject));
}

export async function saveToArena(buffer: ArrayBuffer, character: string) {
  const response = await fetch(`/dev/mascot/save?character=${encodeURIComponent(character)}`, {
    method: "POST",
    body: buffer,
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as { path: string; bytes: number };
}
