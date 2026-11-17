import * as THREE from "three";

import {
  BONE_PARENTS,
  COLLAR,
  JACKET,
  LEG,
  MASCOT_BONES,
  MASCOT_PALETTE as P,
  SHOE,
  type MascotBone,
  type Vec3,
  WRIST,
} from "./mascot-spec";
import {
  HeadLoft,
  type HeadProfile,
  type Painter,
  bakeHeadTexture,
  defaultHeadProfile,
  fallbackPaint,
  paintVertexColors,
} from "./head-loft";
import { cone, earGeometry, ellipsoid, limb, orientedEllipsoid, outlineOf, shoe, v3 } from "./mascot-parts";
import { reshapeTemples } from "./head-temples";
import { jacketTexture, trouserTexture } from "./mascot-textures";

export const MASCOT_NAME = "HostMascot";
export const OUTLINE_PREFIX = "Outline_";
const OUTLINE_THICKNESS = 0.0055;
const EAR_OUTSET = 0.004;
const JACKET_ROWS = 64;
const MIC_AXIS = new THREE.Vector3(-0.35, -0.55, 0.76).normalize();

export type MascotBuild = { root: THREE.Group; dispose: () => void };

type Materials = ReturnType<typeof createMaterials>;

function createMaterials(headMap: THREE.Texture, jacketMap: THREE.Texture, trouserMap: THREE.Texture) {
  const cloth = (name: string, color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({
      name,
      color,
      roughness: 0.85,
      metalness: 0,
      ...extra,
    });
  return {
    sleeve: cloth("M_Host_Sleeve", P.jacket),
    jacket: cloth("M_Host_Jacket", "#ffffff", {
      map: jacketMap,
      side: THREE.DoubleSide,
    }),
    shirt: cloth("M_Host_Shirt", P.shirt),
    collar: cloth("M_Host_Collar", P.shirt, { side: THREE.DoubleSide }),
    trousers: cloth("M_Host_Trousers", "#ffffff", { map: trouserMap }),
    shoes: cloth("M_Host_Shoes", P.shoes, { roughness: 0.35 }),
    skin: cloth("M_Host_Skin", P.skin, { roughness: 0.6 }),
    head: cloth("M_Host_Head", "#ffffff", { map: headMap, roughness: 0.6 }),
    painted: cloth("M_Host_Painted", "#ffffff", { vertexColors: true, roughness: 0.6 }),
    mic: cloth("M_Host_Mic", P.mic, { roughness: 0.35, metalness: 0.4 }),
    micGrille: cloth("M_Host_MicGrille", P.micGrille, {
      roughness: 0.5,
      metalness: 0.6,
    }),
    outline: new THREE.MeshBasicMaterial({
      name: "M_Host_Outline",
      color: P.outline,
    }),
  };
}

function createSkeleton(root: THREE.Group) {
  const bones = {} as Record<MascotBone, THREE.Bone>;
  for (const name of Object.keys(MASCOT_BONES) as MascotBone[]) {
    const bone = new THREE.Bone();
    bone.name = name;
    const parent = BONE_PARENTS[name];
    const position = v3(MASCOT_BONES[name]);
    if (parent) position.sub(v3(MASCOT_BONES[parent]));
    bone.position.copy(position);
    (parent ? bones[parent] : root).add(bone);
    bones[name] = bone;
  }
  root.updateMatrixWorld(true);
  return { bones, skeleton: new THREE.Skeleton(Object.values(bones)) };
}

function jacketGeometry() {
  const curve = new THREE.SplineCurve(JACKET.profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const profile = curve.getSpacedPoints(JACKET_ROWS);
  const geometry = new THREE.LatheGeometry(profile, 64, Math.PI);
  geometry.scale(1, 1, JACKET.depthRatio);
  geometry.translate(0, 0, JACKET.centerZ);
  return { geometry, profile };
}

function openCollar() {
  const points = COLLAR.profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geometry = new THREE.LatheGeometry(points, 40, COLLAR.frontGap, Math.PI * 2 - COLLAR.frontGap * 2);
  geometry.translate(0, 0, COLLAR.centerZ);
  return geometry;
}

function skinToSpineAndChest(geometry: THREE.BufferGeometry, spine: number, chest: number) {
  const count = geometry.attributes.position.count;
  const indices = new Uint16Array(count * 4);
  const weights = new Float32Array(count * 4);
  const [from, to] = JACKET.spineToChest;
  for (let i = 0; i < count; i++) {
    const w = THREE.MathUtils.smoothstep(geometry.attributes.position.getY(i), from, to);
    indices.set([spine, chest, 0, 0], i * 4);
    weights.set([1 - w, w, 0, 0], i * 4);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
}

export type MascotOptions = { head?: HeadProfile | null; paint?: Painter | null };

export function buildMascot({ head, paint }: MascotOptions = {}): MascotBuild {
  const root = new THREE.Group();
  root.name = MASCOT_NAME;
  const geometries: THREE.BufferGeometry[] = [];

  const profile = head ?? defaultHeadProfile();
  const loft = new HeadLoft(profile);
  const fallback = fallbackPaint(profile);
  const painter = paint ?? fallback;
  const { geometry: jacket, profile: jacketProfile } = jacketGeometry();
  const headTexture = bakeHeadTexture(loft, painter, fallback);
  if (head) reshapeTemples(headTexture.image as HTMLCanvasElement);
  const textures = [headTexture, jacketTexture(jacketProfile), trouserTexture()];
  const m: Materials = createMaterials(textures[0], textures[1], textures[2]);

  const { bones, skeleton } = createSkeleton(root);
  const boneIndex = (name: MascotBone) => skeleton.bones.indexOf(bones[name]);

  const add = (
    bone: MascotBone,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    outline = true,
  ) => {
    geometry.translate(...(MASCOT_BONES[bone].map((v) => -v) as Vec3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    bones[bone].add(mesh);
    geometries.push(geometry);
    if (outline) {
      const hull = outlineOf(geometry, OUTLINE_THICKNESS);
      const outlineMesh = new THREE.Mesh(hull, m.outline);
      outlineMesh.name = OUTLINE_PREFIX + name;
      bones[bone].add(outlineMesh);
      geometries.push(hull);
    }
  };

  skinToSpineAndChest(jacket, boneIndex("Spine"), boneIndex("Chest"));
  const jacketHull = outlineOf(jacket, OUTLINE_THICKNESS);
  for (const [name, geometry, material] of [
    ["Jacket", jacket, m.jacket],
    [OUTLINE_PREFIX + "Jacket", jacketHull, m.outline],
  ] as const) {
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = material !== m.outline;
    root.add(mesh);
    mesh.bind(skeleton);
    geometries.push(geometry);
  }

  add("Hips", "Seat", ellipsoid([0, 0.86, -0.025], [0.165, 0.1, 0.12]), m.trousers, false);
  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    add("Hips", `Leg${side}`, limb(LEG.top[side], LEG.ankle[side], LEG.profile), m.trousers);
    add("Hips", `Shoe${side}`, shoe(SHOE.center[side], SHOE.size, sign * SHOE.toeOut), m.shoes);

    const upper = `UpperArm${side}` as const;
    const fore = `Forearm${side}` as const;
    const shoulder = v3(MASCOT_BONES[upper]);
    const elbow = v3(MASCOT_BONES[fore]);
    const wrist = v3(WRIST[side]);
    const along = wrist.clone().sub(elbow).normalize();
    add(
      upper,
      `Shoulder${side}`,
      ellipsoid(shoulder.clone().add(new THREE.Vector3(0, -0.012, 0)), [0.062, 0.062, 0.062], 20),
      m.sleeve,
      false,
    );
    add(
      upper,
      `Sleeve${side}`,
      limb(shoulder, elbow, [
        [0.066, 0],
        [0.064, 0.2],
        [0.058, 0.6],
        [0.054, 1],
      ]),
      m.sleeve,
    );
    add(fore, `Elbow${side}`, ellipsoid(elbow, [0.054, 0.054, 0.054], 16), m.sleeve, false);
    add(
      fore,
      `Forearm${side}`,
      limb(elbow, wrist, [
        [0.054, 0],
        [0.052, 0.5],
        [0.049, 1],
      ]),
      m.sleeve,
    );
    const cuffStart = wrist.clone().addScaledVector(along, -0.008);
    const cuffEnd = wrist.clone().addScaledVector(along, 0.022);
    add(
      fore,
      `Cuff${side}`,
      limb(cuffStart, cuffEnd, [
        [0.046, 0],
        [0.044, 1],
      ]),
      m.shirt,
    );

    if (side === "L") {
      const palm = wrist.clone().addScaledVector(along, 0.075);
      add(fore, "HandL", orientedEllipsoid(palm, [0.026, 0.065, 0.045], along), m.skin);
      const thumbBase = wrist
        .clone()
        .addScaledVector(along, 0.04)
        .add(new THREE.Vector3(-0.01, 0, 0.035));
      add(
        fore,
        "ThumbL",
        cone(thumbBase, thumbBase.clone().add(new THREE.Vector3(-0.005, -0.045, 0.012)), 0.014),
        m.skin,
      );
    } else {
      const fist = wrist.clone().addScaledVector(along, 0.05);
      add(fore, "HandR", orientedEllipsoid(fist, [0.042, 0.05, 0.046], along), m.skin);
      const butt = fist.clone().addScaledVector(MIC_AXIS, -0.08);
      const neck = fist.clone().addScaledVector(MIC_AXIS, 0.065);
      add(
        fore,
        "MicHandle",
        limb(butt, neck, [
          [0.0, 0],
          [0.013, 0.02],
          [0.015, 0.1],
          [0.02, 1],
        ]),
        m.mic,
      );
      add(
        fore,
        "MicCollar",
        limb(neck, fist.clone().addScaledVector(MIC_AXIS, 0.08), [
          [0.022, 0],
          [0.022, 1],
        ]),
        m.micGrille,
      );
      add(
        fore,
        "MicGrille",
        ellipsoid(fist.clone().addScaledVector(MIC_AXIS, 0.105), [0.03, 0.03, 0.03], 20),
        m.micGrille,
      );
    }
  }

  add("Chest", "Collar", openCollar(), m.collar, false);
  add(
    "Neck",
    "Neck",
    limb(
      [0, 1.33, -0.02],
      [0, 1.47, -0.02],
      [
        [0.044, 0],
        [0.044, 1],
      ],
    ),
    m.skin,
    false,
  );

  add("Head", "Head", loft.geometry(), m.head);
  if (profile.nose) {
    const { y, base, tip } = profile.nose;
    const depth = (tip - base) / 2;
    const nose = ellipsoid([profile.centerX, y + 0.008, base + depth], [0.015, 0.026, depth], 16);
    add("Head", "Nose", paintVertexColors(nose, painter, fallback), m.painted, false);
  }
  const earRim = new THREE.Color(P.skin);
  const earInner = earRim.clone().offsetHSL(-0.01, 0.05, -0.12);
  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    const { y, halfWidth, z } = profile.ear;
    const center = new THREE.Vector3(profile.centerX + sign * (halfWidth + EAR_OUTSET), y, z);
    add("Head", `Ear${side}`, earGeometry(center, sign, earRim, earInner), m.painted);
  }

  root.updateMatrixWorld(true);

  return {
    root,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      Object.values(m).forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}
