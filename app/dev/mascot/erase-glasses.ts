import type { GlassesSpec } from "@/components/quiz-cup/arena/mascot/mascot-spec";

import { type ConceptArt, type ViewName, toMeters, toPixel } from "./concept-art";

// Drawn glasses get projected onto the face like a decal. Before painting, cover each dark rim, bridge
// and temple stroke with the colour just outside it, so the 3D glasses are the only ones visible.

const RING_BAND = 0.0095;
const RING_SOURCE_GAP = 0.005;
const BRIDGE_BAND = 0.008;
const BRIDGE_SOURCE_ABOVE = 0.015;
const TEMPLE_BAND = 0.0085;
const TEMPLE_SOURCE_ABOVE = 0.013;
const SIDE_LENS_SOURCE_ABOVE = 0.008;
const FRONT_MAX_LUMA = 165;
const SIDE_MAX_LUMA = 150;
const MARGIN = 0.02;

type Source = [number, number] | null;

export function eraseGlasses(art: ConceptArt, glasses: GlassesSpec): ConceptArt {
  const rgba = new Uint8ClampedArray(art.rgba);
  const luma = (i: number) => 0.3 * art.rgba[i] + 0.59 * art.rgba[i + 1] + 0.11 * art.rgba[i + 2];

  const patch = (name: ViewName, yRange: [number, number], maxLuma: number, sourceOf: (lateral: number, y: number) => Source) => {
    const view = art.views[name];
    const top = Math.max(0, Math.round(toPixel(view, 0, yRange[1])[1]));
    const bottom = Math.min(art.height - 1, Math.round(toPixel(view, 0, yRange[0])[1]));
    for (let py = top; py <= bottom; py++) {
      for (let px = view.left; px <= view.right; px++) {
        const i = (py * art.width + px) * 4;
        if (luma(i) >= maxLuma) continue;
        const [lateral, y] = toMeters(view, px + 0.5, py + 0.5);
        const source = sourceOf(lateral, y);
        if (!source) continue;
        const [sx, sy] = toPixel(view, source[0], source[1]).map(Math.round);
        if (sx < view.left || sx > view.right || sy < 0 || sy >= art.height) continue;
        const j = (sy * art.width + sx) * 4;
        rgba[i] = art.rgba[j];
        rgba[i + 1] = art.rgba[j + 1];
        rgba[i + 2] = art.rgba[j + 2];
      }
    }
  };

  const { lensX, lensY, radius, bridgeY, templeY, sideTempleY, sideLensZ, sideLensY } = glasses;
  const frontRange: [number, number] = [lensY - radius - MARGIN, lensY + radius + MARGIN];
  patch("front", frontRange, FRONT_MAX_LUMA, (x, y) => {
    const side = Math.sign(x) || 1;
    const dx = Math.abs(x) - lensX;
    const dy = y - lensY;
    const distance = Math.hypot(dx, dy);
    if (Math.abs(distance - radius) < RING_BAND && distance > 0) {
      const reach = (radius + RING_BAND + RING_SOURCE_GAP) / distance;
      return [side * (lensX + dx * reach), lensY + dy * reach];
    }
    if (Math.abs(x) < lensX - radius + RING_BAND && Math.abs(y - bridgeY) < BRIDGE_BAND) return [x, y + BRIDGE_SOURCE_ABOVE];
    if (Math.abs(x) > lensX + radius - RING_BAND && Math.abs(y - templeY) < TEMPLE_BAND) return [x, y + TEMPLE_SOURCE_ABOVE];
    return null;
  });

  for (const [name, toZ] of [
    ["right", (lateral: number) => lateral],
    ["left", (lateral: number) => -lateral],
  ] as const) {
    patch(name, [Math.min(sideLensY[0], sideTempleY - TEMPLE_BAND), sideLensY[1]], SIDE_MAX_LUMA, (lateral, y) => {
      const z = toZ(lateral);
      if (z < sideLensZ[0] && Math.abs(y - sideTempleY) < TEMPLE_BAND) return [lateral, y + TEMPLE_SOURCE_ABOVE];
      if (z >= sideLensZ[0] && z <= sideLensZ[1] && y >= sideLensY[0] && y <= sideLensY[1]) {
        return [lateral, sideLensY[1] + SIDE_LENS_SOURCE_ABOVE];
      }
      return null;
    });
  }

  return { ...art, rgba };
}
