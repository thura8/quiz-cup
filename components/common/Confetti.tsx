"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const CONFIG = {
  intervalMs: 1400,
  fireBothCorners: true,

  particlesPerShot: 90,
  sizeMin: 6,
  sizeMax: 13,

  angleLeft: 65,
  angleRight: 115,
  spread: 45,
  power: 14,
  powerVariance: 6,

  gravity: 0.28,
  drag: 0.985,
  drift: 0.35,
  fadeStart: 0.75,

  colors: ["#FB623D", "#0479FB", "#F94AA1", "#FCDD53", "#37994D"],

  offsetX: 12,
  offsetY: 12,
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rot: number;
  spin: number;
  wobble: number;
  life: number;
  maxLife: number;
};

type Props = {
  className?: string;
};

const Confetti = ({ className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let W = 0;
    let H = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];

    const spawn = (x: number, y: number, baseAngleDeg: number) => {
      const angle =
        ((baseAngleDeg + rand(-CONFIG.spread / 2, CONFIG.spread / 2)) *
          Math.PI) /
        180;
      const speed = CONFIG.power + rand(-CONFIG.powerVariance, CONFIG.powerVariance);
      const size = rand(CONFIG.sizeMin, CONFIG.sizeMax);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        w: size,
        h: size * rand(0.4, 0.7),
        color: pick(CONFIG.colors),
        rot: rand(0, Math.PI * 2),
        spin: rand(-0.25, 0.25),
        wobble: rand(0, Math.PI * 2),
        life: 0,
        maxLife: rand(150, 230),
      });
    };

    const fire = (corner: "left" | "right") => {
      const n = CONFIG.particlesPerShot;
      if (corner === "left") {
        const x = CONFIG.offsetX;
        const y = H - CONFIG.offsetY;
        for (let i = 0; i < n; i++) spawn(x, y, CONFIG.angleLeft);
      } else {
        const x = W - CONFIG.offsetX;
        const y = H - CONFIG.offsetY;
        for (let i = 0; i < n; i++) spawn(x, y, CONFIG.angleRight);
      }
    };

    const fireAll = () => {
      fire("left");
      if (CONFIG.fireBothCorners) fire("right");
    };

    const update = () => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.vy += CONFIG.gravity;
        p.vx *= CONFIG.drag;
        p.vy *= CONFIG.drag;
        p.wobble += 0.1;
        p.x += p.vx + Math.sin(p.wobble) * CONFIG.drift;
        p.y += p.vy;
        p.rot += p.spin;

        if (p.life > p.maxLife || p.y > H + 40) {
          particles.splice(i, 1);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const t = p.life / p.maxLife;
        let alpha = 1;
        if (t > CONFIG.fadeStart) {
          alpha = 1 - (t - CONFIG.fadeStart) / (1 - CONFIG.fadeStart);
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const flip = Math.abs(Math.cos(p.wobble));
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w * (0.3 + 0.7 * flip), p.h);
        ctx.restore();
      }
    };

    let rafId: number;
    const frame = () => {
      update();
      draw();
      rafId = requestAnimationFrame(frame);
    };

    const handleClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("button, a, [role='button']")) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let i = 0; i < CONFIG.particlesPerShot; i++) spawn(x, y, 90);
    };

    fireAll();
    const intervalId = window.setInterval(fireAll, CONFIG.intervalMs);
    window.addEventListener("click", handleClick);
    frame();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", handleClick);
      window.clearInterval(intervalId);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
};

export default Confetti;
