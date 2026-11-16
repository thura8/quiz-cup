"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { QUIZ_CUP_LOGO } from "@/constants/quiz-cup";
import { QUIZ_CUP_SCREEN } from "@/constants/quiz-cup-arena";
import { STUDIO } from "@/constants/quiz-cup-studio";

const SCREEN_WIDTH = 1600;
const SCREEN_HEIGHT = 900;
const SPARKLE_COUNT = 70;

const COLOR_BLOBS: [x: number, y: number, radius: number, color: string][] = [
  [0.22, 0.3, 0.55, "rgba(178,92,255,0.55)"],
  [0.8, 0.25, 0.5, "rgba(76,107,255,0.45)"],
  [0.55, 0.75, 0.6, "rgba(255,95,210,0.25)"],
  [0.1, 0.85, 0.4, "rgba(76,107,255,0.35)"],
];

type Context = CanvasRenderingContext2D;

function fillBackground(context: Context) {
  const gradient = context.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
  gradient.addColorStop(0, STUDIO.screenTop);
  gradient.addColorStop(1, STUDIO.screenBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

function fillColorBlobs(context: Context) {
  for (const [x, y, radius, color] of COLOR_BLOBS) {
    const centerX = x * SCREEN_WIDTH;
    const centerY = y * SCREEN_HEIGHT;
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * SCREEN_WIDTH);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }
}

function drawSparkles(context: Context) {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const x = random() * SCREEN_WIDTH;
    const y = random() * SCREEN_HEIGHT;
    const radius = 6 + random() * 34;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    const rgb = random() < 0.5 ? "190,150,255" : random() < 0.5 ? "255,190,110" : "120,150,255";
    gradient.addColorStop(0, `rgba(${rgb},${0.12 + random() * 0.25})`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function fillCenterGlow(context: Context) {
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT * 0.62;
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, SCREEN_WIDTH * 0.45);
  gradient.addColorStop(0, "rgba(120,170,255,0.55)");
  gradient.addColorStop(0.4, "rgba(140,92,255,0.25)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

function drawLogo(context: Context, logo: HTMLImageElement | ImageBitmap) {
  const height = SCREEN_HEIGHT * 0.78;
  const width = (logo.width / logo.height) * height;
  context.shadowColor = "rgba(20,8,60,0.8)";
  context.shadowBlur = 40;
  context.drawImage(logo, (SCREEN_WIDTH - width) / 2, (SCREEN_HEIGHT - height) / 2 + 10, width, height);
}

function drawScreenTexture(logo: HTMLImageElement | ImageBitmap | null) {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const context = canvas.getContext("2d")!;

  fillBackground(context);
  fillColorBlobs(context);
  drawSparkles(context);
  fillCenterGlow(context);
  if (logo) drawLogo(context, logo);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default function MainScreen() {
  const logo = useTexture(QUIZ_CUP_LOGO);
  const { geometry, material } = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      map: drawScreenTexture(logo.image as HTMLImageElement),
      toneMapped: false,
    });
    material.color.setScalar(0.92);
    material.fog = false;
    return { geometry: new THREE.PlaneGeometry(QUIZ_CUP_SCREEN.width, QUIZ_CUP_SCREEN.height), material };
  }, [logo]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh geometry={geometry} material={material} position={[0, QUIZ_CUP_SCREEN.centerY, QUIZ_CUP_SCREEN.z]} />
  );
}

export function preloadMainScreen() {
  useTexture.preload(QUIZ_CUP_LOGO);
}
