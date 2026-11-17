import * as THREE from "three";

import { BONE_PARENTS, type CharacterSpec, type MascotBone, type Vec3 } from "./mascot-spec";
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

export const OUTLINE_PREFIX = "Outline_";
const OUTLINE_THICKNESS = 0.0055;
const EAR_OUTSET = 0.004;
const JACKET_ROWS = 64;
const MIC_AXIS = new THREE.Vector3(-0.35, -0.55, 0.76).normalize();
const SOLE_HEIGHT_SHARE = 0.38;
const SOLE_GROWTH = 1.04;

export type MascotBuild = { root: THREE.Group; dispose: () => void };

type Materials = ReturnType<typeof createMaterials>;

function createMaterials(
  spec: CharacterSpec,
  headMap: THREE.Texture,
  jacketMap: THREE.Texture,
  trouserMap: THREE.Texture,
) {
  const P = spec.palette;
  const named = (part: string) => `M_${spec.materialPrefix}_${part}`;
  const cloth = (part: string, color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({
      name: named(part),
      color,
      roughness: 0.85,
      metalness: 0,
      ...extra,
    });
  return {
    sleeve: cloth("Sleeve", P.jacket),
    jacket: cloth("Jacket", "#ffffff", {
      map: jacketMap,
      side: THREE.DoubleSide,
    }),
    shirt: cloth("Shirt", P.shirt),
    cuff: cloth("Cuff", P.cuff ?? P.jacket),
    collar: cloth("Collar", spec.collar.material === "shirt" ? P.shirt : P.jacket, { side: THREE.DoubleSide }),
    trousers: cloth("Trousers", "#ffffff", { map: trouserMap }),
    shoes: cloth("Shoes", P.shoes, { roughness: 0.35 }),
    sole: cloth("Sole", P.sole ?? P.shoes, { roughness: 0.5 }),
    skin: cloth("Skin", P.skin, { roughness: 0.6 }),
    head: cloth("Head", "#ffffff", { map: headMap, roughness: 0.6 }),
    painted: cloth("Painted", "#ffffff", { vertexColors: true, roughness: 0.6 }),
    mic: cloth("Mic", P.mic ?? P.outline, { roughness: 0.35, metalness: 0.4 }),
    micGrille: cloth("MicGrille", P.micGrille ?? P.outline, {
      roughness: 0.5,
      metalness: 0.6,
    }),
    outline: new THREE.MeshBasicMaterial({
      name: named("Outline"),
      color: P.outline,
    }),
  };
}

function createSkeleton(spec: CharacterSpec, root: THREE.Group) {
  const bones = {} as Record<MascotBone, THREE.Bone>;
  for (const name of Object.keys(BONE_PARENTS) as MascotBone[]) {
    const bone = new THREE.Bone();
    bone.name = name;
    const parent = BONE_PARENTS[name];
    const position = v3(spec.bones[name]);
    if (parent) position.sub(v3(spec.bones[parent]));
    bone.position.copy(position);
    (parent ? bones[parent] : root).add(bone);
    bones[name] = bone;
  }
  root.updateMatrixWorld(true);
  return { bones, skeleton: new THREE.Skeleton(Object.values(bones)) };
}

function jacketGeometry(spec: CharacterSpec) {
  const { jacket } = spec;
  const curve = new THREE.SplineCurve(jacket.profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const profile = curve.getSpacedPoints(JACKET_ROWS);
  const geometry = new THREE.LatheGeometry(profile, 64, Math.PI);
  geometry.scale(1, 1, jacket.depthRatio);
  geometry.translate(0, 0, jacket.centerZ);
  return { geometry, profile };
}

function openCollar(spec: CharacterSpec) {
  const { collar } = spec;
  const points = collar.profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geometry = new THREE.LatheGeometry(points, 40, collar.frontGap, Math.PI * 2 - collar.frontGap * 2);
  geometry.translate(0, 0, collar.centerZ);
  return geometry;
}

function skinToSpineAndChest(spec: CharacterSpec, geometry: THREE.BufferGeometry, spine: number, chest: number) {
  const count = geometry.attributes.position.count;
  const indices = new Uint16Array(count * 4);
  const weights = new Float32Array(count * 4);
  const [from, to] = spec.jacket.spineToChest;
  for (let i = 0; i < count; i++) {
    const w = THREE.MathUtils.smoothstep(geometry.attributes.position.getY(i), from, to);
    indices.set([spine, chest, 0, 0], i * 4);
    weights.set([1 - w, w, 0, 0], i * 4);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
}

export type MascotOptions = { spec: CharacterSpec; head?: HeadProfile | null; paint?: Painter | null };

export function buildMascot({ spec, head, paint }: MascotOptions): MascotBuild {
  const root = new THREE.Group();
  root.name = spec.rootName;
  const geometries: THREE.BufferGeometry[] = [];

  const profile = head ?? defaultHeadProfile(spec.head);
  const loft = new HeadLoft(profile);
  const fallback = fallbackPaint(profile, spec.palette);
  const painter = paint ?? fallback;
  const { geometry: jacket, profile: jacketProfile } = jacketGeometry(spec);
  const headTexture = bakeHeadTexture(loft, painter, fallback);
  if (head && spec.reshapeTemples) reshapeTemples(headTexture.image as HTMLCanvasElement);
  const textures = [headTexture, jacketTexture(spec, jacketProfile), trouserTexture(spec)];
  const m: Materials = createMaterials(spec, textures[0], textures[1], textures[2]);

  const { bones, skeleton } = createSkeleton(spec, root);
  const boneIndex = (name: MascotBone) => skeleton.bones.indexOf(bones[name]);

  const add = (
    bone: MascotBone,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    outline = true,
  ) => {
    geometry.translate(...(spec.bones[bone].map((v) => -v) as Vec3));
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

  skinToSpineAndChest(spec, jacket, boneIndex("Spine"), boneIndex("Chest"));
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

  add("Hips", "Seat", ellipsoid(spec.seat.center, spec.seat.radii), m.trousers, false);
  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    add("Hips", `Leg${side}`, limb(spec.leg.top[side], spec.leg.ankle[side], spec.leg.profile), m.trousers);
    add("Hips", `Shoe${side}`, shoe(spec.shoe.center[side], spec.shoe.size, sign * spec.shoe.toeOut), m.shoes);
    if (spec.palette.sole) {
      const [width, height, length] = spec.shoe.size;
      const [x, y, z] = spec.shoe.center[side];
      const soleHeight = height * SOLE_HEIGHT_SHARE;
      add(
        "Hips",
        `Sole${side}`,
        shoe(
          [x, y - height / 2 + soleHeight / 2, z],
          [width * SOLE_GROWTH, soleHeight, length * SOLE_GROWTH],
          sign * spec.shoe.toeOut,
        ),
        m.sole,
      );
    }

    const upper = `UpperArm${side}` as const;
    const fore = `Forearm${side}` as const;
    const shoulder = v3(spec.bones[upper]);
    const elbow = v3(spec.bones[fore]);
    const wrist = v3(spec.wrist[side]);
    const along = wrist.clone().sub(elbow).normalize();
    const { sleeve } = spec;
    add(
      upper,
      `Shoulder${side}`,
      ellipsoid(
        shoulder.clone().add(new THREE.Vector3(0, -0.012, 0)),
        [sleeve.shoulderRadius, sleeve.shoulderRadius, sleeve.shoulderRadius],
        20,
      ),
      m.sleeve,
      false,
    );
    add(upper, `Sleeve${side}`, limb(shoulder, elbow, sleeve.upper), m.sleeve);
    add(
      fore,
      `Elbow${side}`,
      ellipsoid(elbow, [sleeve.elbowRadius, sleeve.elbowRadius, sleeve.elbowRadius], 16),
      m.sleeve,
      false,
    );
    add(fore, `Forearm${side}`, limb(elbow, wrist, sleeve.forearm), m.sleeve);
    const cuffStart = wrist.clone().addScaledVector(along, sleeve.cuff.from);
    const cuffEnd = wrist.clone().addScaledVector(along, sleeve.cuff.to);
    add(
      fore,
      `Cuff${side}`,
      limb(cuffStart, cuffEnd, sleeve.cuff.profile),
      sleeve.cuff.material === "shirt" ? m.shirt : m.cuff,
    );

    if (spec.hands[side] === "open") {
      const palm = wrist.clone().addScaledVector(along, 0.075);
      add(fore, `Hand${side}`, orientedEllipsoid(palm, [0.026, 0.065, 0.045], along), m.skin);
      const thumbBase = wrist
        .clone()
        .addScaledVector(along, 0.04)
        .add(new THREE.Vector3(-0.01 * sign, 0, 0.035));
      add(
        fore,
        `Thumb${side}`,
        cone(thumbBase, thumbBase.clone().add(new THREE.Vector3(-0.005 * sign, -0.045, 0.012)), 0.014),
        m.skin,
      );
    } else {
      const fist = wrist.clone().addScaledVector(along, 0.05);
      add(fore, `Hand${side}`, orientedEllipsoid(fist, [0.042, 0.05, 0.046], along), m.skin);
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

  add("Chest", "Collar", openCollar(spec), m.collar, false);
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
  const earRim = new THREE.Color(spec.palette.skin);
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
