import * as THREE from "three";

import { BONE_PARENTS, type CharacterSpec, type GlassesSpec, type MascotBone, type Vec3 } from "./mascot-spec";
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
import { foldTexture, jacketTexture, ribTexture, trouserTexture } from "./mascot-textures";

export const OUTLINE_PREFIX = "Outline_";
const OUTLINE_THICKNESS = 0.0055;
const EAR_OUTSET = 0.004;
const JACKET_ROWS = 64;
const MIC_AXIS = new THREE.Vector3(-0.35, -0.55, 0.76).normalize();
const SOLE_HEIGHT_SHARE = 0.38;
const SOLE_GROWTH = 1.04;
const FRONT = new THREE.Vector3(0, 0, 1);
const CORD_SEGMENTS = 4;
const HOOD_RIM_POINTS = 24;
const GLASSES_LENS_OPACITY = 0.12;
const GLASSES_WRAP = 0.18;
const GLASSES_BRIDGE_GAP = 0.004;
const GLASSES_BRIDGE_SAG = 0.004;
const GLASSES_ARM_SHARE = 0.8;
const GLASSES_ARM_CLEARANCE = 0.006;
const GLASSES_ARM_DROP = 0.025;
const GLASSES_ARM_OVER_EAR = 0.012;
const HOOD_ROWS = 24;
const HOOD_COLUMNS = 24;
const HOOD_TAPER = 0.55;
const HOOD_FOLD = 0.18;
const HOOD_THINNING = 0.7;
const HOOD_LIFT = 0.003;
const HOOD_SEAM_POINTS = 8;
const HOOD_SEAM_LENGTH = 0.85;
const HOOD_EDGE = 0.985;
const HOOD_TOP_WIDTH = 0.72;
const HOOD_WIDEST_AT = 0.3;
const SEAM_RADIUS = 0.0018;
const SEAM_LIFT = new THREE.Vector3(0, 0, -0.002);
const CORD_RADIUS = 0.0045;
const CORD_LIFT = 0.007;
const AGLET_RADIUS = 0.0055;
const AGLET_LENGTH = 0.02;
const ZIPPER_PULL_ABOVE_HEM = 0.03;

export type MascotBuild = { root: THREE.Group; dispose: () => void };

type Materials = ReturnType<typeof createMaterials>;

type MaterialMaps = {
  head: THREE.Texture;
  jacket: THREE.Texture;
  trousers: THREE.Texture;
  cuff: THREE.Texture | null;
  folds: THREE.Texture | null;
};

function createMaterials(spec: CharacterSpec, maps: MaterialMaps) {
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
    sleeveFolds: cloth("SleeveFolds", maps.folds ? "#ffffff" : P.jacket, { map: maps.folds }),
    jacket: cloth("Jacket", "#ffffff", {
      map: maps.jacket,
      side: THREE.DoubleSide,
    }),
    shirt: cloth("Shirt", P.shirt),
    cuff: maps.cuff ? cloth("Cuff", "#ffffff", { map: maps.cuff }) : cloth("Cuff", P.cuff ?? P.jacket),
    collar: cloth("Collar", spec.collar?.material === "shirt" ? P.shirt : P.jacket, { side: THREE.DoubleSide }),
    hood: cloth("Hood", P.jacket, { side: THREE.DoubleSide }),
    cord: cloth("Cord", P.trim ?? P.shirt),
    metal: cloth("Metal", P.metal ?? "#c8c8cc", { roughness: 0.35, metalness: 0.5 }),
    trousers: cloth("Trousers", "#ffffff", { map: maps.trousers }),
    shoes: cloth("Shoes", P.shoes, { roughness: 0.35 }),
    sole: cloth("Sole", P.sole ?? P.shoes, { roughness: 0.5 }),
    skin: cloth("Skin", P.skin, { roughness: 0.6 }),
    head: cloth("Head", "#ffffff", { map: maps.head, roughness: 0.6 }),
    painted: cloth("Painted", "#ffffff", { vertexColors: true, roughness: 0.6 }),
    mic: cloth("Mic", P.mic ?? P.outline, { roughness: 0.35, metalness: 0.4 }),
    micGrille: cloth("MicGrille", P.micGrille ?? P.outline, {
      roughness: 0.5,
      metalness: 0.6,
    }),
    glassesFrame: cloth("GlassesFrame", spec.glasses?.color ?? P.outline, { roughness: 0.4, metalness: 0.2 }),
    glassesLens: new THREE.MeshBasicMaterial({
      name: named("GlassesLens"),
      color: spec.glasses?.lens ?? "#ffffff",
      transparent: true,
      opacity: GLASSES_LENS_OPACITY,
      depthWrite: false,
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

function openRing(profile: [number, number][], frontGap: number, centerZ: number, segments = 40) {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geometry = new THREE.LatheGeometry(points, segments, frontGap, Math.PI * 2 - frontGap * 2);
  geometry.translate(0, 0, centerZ);
  return geometry;
}

function hoodRimPath({ center, radiusX, radiusZ, drop, sweep }: NonNullable<CharacterSpec["hood"]>["rim"]) {
  const [cx, cy, cz] = center;
  const reach = THREE.MathUtils.degToRad(sweep);
  const points = Array.from({ length: HOOD_RIM_POINTS + 1 }, (_, i) => {
    const angle = THREE.MathUtils.lerp(reach, -reach, i / HOOD_RIM_POINTS);
    const share = Math.abs(angle) / reach;
    return new THREE.Vector3(
      cx + radiusX * Math.sin(angle),
      cy - drop * share * share,
      cz - radiusZ * Math.cos(angle),
    );
  });
  return new THREE.CatmullRomCurve3(points);
}

function jacketRadiusAt(profile: THREE.Vector2[], y: number) {
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if ((y - a.y) * (y - b.y) <= 0 && a.y !== b.y) return THREE.MathUtils.lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
  }
  return y < profile[0].y ? profile[0].x : profile[profile.length - 1].x;
}

function jacketSurfaceZ(spec: CharacterSpec, profile: THREE.Vector2[], x: number, y: number, facing: 1 | -1) {
  const radius = jacketRadiusAt(profile, y);
  return spec.jacket.centerZ + facing * spec.jacket.depthRatio * Math.sqrt(Math.max(radius * radius - x * x, 0));
}

function jacketFrontZ(spec: CharacterSpec, profile: THREE.Vector2[], x: number, y: number) {
  return jacketSurfaceZ(spec, profile, x, y, 1);
}

function hoodShell(spec: CharacterSpec, profile: THREE.Vector2[]) {
  const { top, height, halfWidth, thickness, restOn } = spec.hood!.shell;
  const positions: number[] = [];
  const indices: number[] = [];
  const surface = (u: number, s: number) => {
    const shoulders = THREE.MathUtils.lerp(HOOD_TOP_WIDTH, 1, THREE.MathUtils.smoothstep(s, 0, HOOD_WIDEST_AT));
    const width = halfWidth * shoulders * Math.pow(Math.max(1 - s * s, 0), HOOD_TAPER);
    const x = u * width;
    const y = top - s * height;
    const loft = thickness * THREE.MathUtils.smoothstep(s, 0, HOOD_FOLD) * Math.pow(1 - s, HOOD_THINNING);
    const z = jacketSurfaceZ(spec, profile, x, Math.min(y, restOn), -1) - loft * Math.sqrt(1 - u * u) - HOOD_LIFT;
    return new THREE.Vector3(x, y, z);
  };
  for (let j = 0; j <= HOOD_ROWS; j++) {
    for (let i = 0; i <= HOOD_COLUMNS; i++) {
      positions.push(...surface((i / HOOD_COLUMNS) * 2 - 1, j / HOOD_ROWS).toArray());
    }
  }
  const stride = HOOD_COLUMNS + 1;
  for (let j = 0; j < HOOD_ROWS; j++) {
    for (let i = 0; i < HOOD_COLUMNS; i++) {
      const a = j * stride + i;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const line = (u: number, length: number) =>
    Array.from({ length: HOOD_SEAM_POINTS + 1 }, (_, i) => surface(u, (i / HOOD_SEAM_POINTS) * length));
  return { geometry, lines: [line(0, HOOD_SEAM_LENGTH), line(-HOOD_EDGE, 1), line(HOOD_EDGE, 1)] };
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

function addGlasses(
  glasses: GlassesSpec,
  loft: HeadLoft,
  profile: HeadProfile,
  add: (name: string, geometry: THREE.BufferGeometry, material: THREE.Material) => void,
  m: Materials,
) {
  const { lensX, lensY, radius, rim, standoff, bridgeY, templeY } = glasses;
  const cx = profile.centerX;
  const lensZ = loft.frontAt(cx + lensX, lensY).z + standoff;
  const bridgeZ = Math.max(loft.frontAt(cx, bridgeY).z + GLASSES_BRIDGE_GAP, lensZ);
  const tube = (name: string, points: THREE.Vector3[]) =>
    add(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, rim * GLASSES_ARM_SHARE, 8, false), m.glassesFrame);

  for (const side of [1, -1] as const) {
    const suffix = side > 0 ? "L" : "R";
    const center = new THREE.Vector3(cx + side * lensX, lensY, lensZ);
    const yaw = side * GLASSES_WRAP;
    const ring = new THREE.TorusGeometry(radius, rim, 10, 48);
    ring.rotateY(yaw);
    ring.translate(center.x, center.y, center.z);
    add(`GlassesRim${suffix}`, ring, m.glassesFrame);
    const lens = new THREE.CircleGeometry(radius, 40);
    lens.rotateY(yaw);
    lens.translate(center.x, center.y, center.z - rim * 0.5);
    add(`GlassesLens${suffix}`, lens, m.glassesLens);

    const hinge = new THREE.Vector3(cx + side * (lensX + radius * Math.cos(yaw)), templeY, lensZ - side * radius * Math.sin(yaw));
    const sideX = cx + side * (loft.halfWidthAt(templeY) + GLASSES_ARM_CLEARANCE);
    const ear = profile.ear;
    tube(`GlassesArm${suffix}`, [
      hinge,
      new THREE.Vector3(sideX, templeY, THREE.MathUtils.lerp(hinge.z, ear.z, 0.45)),
      new THREE.Vector3(sideX, templeY - GLASSES_ARM_DROP * 0.4, ear.z + GLASSES_ARM_OVER_EAR),
      new THREE.Vector3(sideX - side * 0.004, templeY - GLASSES_ARM_DROP, ear.z - GLASSES_ARM_OVER_EAR),
    ]);
  }
  const innerX = lensX - radius * Math.cos(GLASSES_WRAP);
  tube("GlassesBridge", [
    new THREE.Vector3(cx + innerX, bridgeY - GLASSES_BRIDGE_SAG, lensZ),
    new THREE.Vector3(cx, bridgeY, bridgeZ),
    new THREE.Vector3(cx - innerX, bridgeY - GLASSES_BRIDGE_SAG, lensZ),
  ]);
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
  const P = spec.palette;
  const maps: MaterialMaps = {
    head: headTexture,
    jacket: jacketTexture(spec, jacketProfile),
    trousers: trouserTexture(spec),
    cuff: spec.outfit.ribbed ? ribTexture(P.cuff ?? P.jacket, P.lapel) : null,
    folds: spec.sleeve.folds ? foldTexture(P.jacket, P.lapel) : null,
  };
  const textures = Object.values(maps).filter((texture): texture is THREE.Texture => !!texture);
  const m: Materials = createMaterials(spec, maps);

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
    add(fore, `Forearm${side}`, limb(elbow, wrist, sleeve.forearm), sleeve.folds ? m.sleeveFolds : m.sleeve);
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

  if (spec.collar) {
    const { profile, frontGap, centerZ } = spec.collar;
    add("Chest", "Collar", openRing(profile, frontGap, centerZ), m.collar, false);
  }
  if (spec.hood) {
    const { rim } = spec.hood;
    const rimPath = hoodRimPath(rim);
    add("Chest", "HoodRim", new THREE.TubeGeometry(rimPath, 64, rim.tube, 12, false), m.hood);
    for (const [end, name] of [
      [rimPath.getPoint(0), "HoodRimEndL"],
      [rimPath.getPoint(1), "HoodRimEndR"],
    ] as const) {
      add("Chest", name, ellipsoid(end, [rim.tube, rim.tube, rim.tube], 12), m.hood, false);
    }
    const shell = hoodShell(spec, jacketProfile);
    add("Chest", "Hood", shell.geometry, m.hood);
    shell.lines.forEach((line, k) =>
      line.slice(1).forEach((point, i) => {
        add(
          "Chest",
          `HoodLine${k}_${i}`,
          limb(line[i].clone().add(SEAM_LIFT), point.clone().add(SEAM_LIFT), [
            [SEAM_RADIUS, 0],
            [SEAM_RADIUS, 1],
          ]),
          m.outline,
          false,
        );
      }),
    );
  }
  const strings = spec.outfit.drawstrings;
  if (strings) {
    for (const sign of [1, -1]) {
      const at = (t: number) => {
        const x = sign * (strings.x + strings.spread * t);
        const y = THREE.MathUtils.lerp(strings.top, strings.bottom, t);
        return new THREE.Vector3(x, y, jacketFrontZ(spec, jacketProfile, x, y) + CORD_LIFT);
      };
      const points = Array.from({ length: CORD_SEGMENTS + 1 }, (_, i) => at(i / CORD_SEGMENTS));
      points.slice(1).forEach((point, i) => {
        add(
          "Chest",
          `Drawstring${sign > 0 ? "L" : "R"}${i}`,
          limb(points[i], point, [
            [CORD_RADIUS, 0],
            [CORD_RADIUS, 1],
          ]),
          m.cord,
          false,
        );
      });
      const end = points[CORD_SEGMENTS];
      const tipDirection = end.clone().sub(points[CORD_SEGMENTS - 1]).normalize();
      add(
        "Chest",
        `Aglet${sign > 0 ? "L" : "R"}`,
        limb(end, end.clone().addScaledVector(tipDirection, AGLET_LENGTH), [
          [AGLET_RADIUS, 0],
          [AGLET_RADIUS, 1],
        ]),
        m.metal,
        false,
      );
    }
  }
  if (spec.outfit.zipper) {
    const y = spec.jacket.profile[0][1] + ZIPPER_PULL_ABOVE_HEM;
    const x = -(spec.outfit.strip.halfBottom + 0.006);
    const z = jacketFrontZ(spec, jacketProfile, x, y) + 0.004;
    add("Spine", "ZipperPull", ellipsoid([x, y, z], [0.006, 0.014, 0.003], 12), m.metal, false);
  }
  add(
    "Neck",
    "Neck",
    limb(spec.neck.from, spec.neck.to, [
      [spec.neck.radius, 0],
      [spec.neck.radius, 1],
    ]),
    m.skin,
    false,
  );

  add("Head", "Head", loft.geometry(), m.head);
  if (profile.nose) {
    const { y, base, tip } = profile.nose;
    const depth = Math.max((tip - base) / 2, spec.noseStyle?.minDepth ?? 0);
    const nose = ellipsoid([profile.centerX, y + 0.008, base + depth], [0.015, 0.026, depth], 16);
    const nosePainter: Painter = spec.noseStyle?.frontOnly ? (point) => painter(point, FRONT) : painter;
    add("Head", "Nose", paintVertexColors(nose, nosePainter, fallback), m.painted, false);
  }
  const earRim = new THREE.Color(spec.palette.skin);
  const earInner = earRim.clone().offsetHSL(-0.01, 0.05, -0.12);
  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    const { y, halfWidth, z } = profile.ear;
    const center = new THREE.Vector3(profile.centerX + sign * (halfWidth + EAR_OUTSET), y, z);
    add("Head", `Ear${side}`, earGeometry(center, sign, earRim, earInner), m.painted);
  }

  if (spec.glasses) addGlasses(spec.glasses, loft, profile, (name, geometry, material) => add("Head", name, geometry, material, false), m);

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
