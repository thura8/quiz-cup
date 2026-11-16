export type SoundBus = "music" | "sfx";

export type PlayOptions = {
  volume?: number;
  rate?: number;
  bus?: SoundBus;
  at?: number;
  maxDelay?: number;
};

export type LoopOptions = {
  volume?: number;
  bus?: SoundBus;
  fadeIn?: number;
};

export type MusicOptions = {
  at: number;
  offsetMs?: number;
  barMs: number;
  rate?: number;
  volume?: number;
  bus?: SoundBus;
  onError?: (error: unknown) => void;
};

export type SoundHandle = {
  stop: (fadeOut?: number) => void;
};

const MUTE_STORAGE_KEY = "ddjj:sound-muted";

const MAX_LATE_START_MS = 250;
const METRONOME_LOOKAHEAD_MS = 100;
const MUSIC_LOOKAHEAD_MS = 2000;
const NOOP_HANDLE: SoundHandle = { stop: () => {} };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buses: Record<SoundBus, GainNode> | null = null;
const busVolume: Record<SoundBus, number> = { music: 1, sfx: 1 };

const decoded = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer>>();

let muted = readStoredMute();
const listeners = new Set<() => void>();

function readStoredMute(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(MUTE_STORAGE_KEY) === "1"
    );
  } catch {
    return false;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined" || !window.AudioContext) return null;

  ctx = new AudioContext({ latencyHint: "interactive" });
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);

  buses = {
    music: ctx.createGain(),
    sfx: ctx.createGain(),
  };
  for (const bus of Object.keys(buses) as SoundBus[]) {
    buses[bus].gain.value = busVolume[bus];
    buses[bus].connect(master);
  }

  ctx.addEventListener("statechange", emit);
  return ctx;
}

function installUnlock() {
  if (typeof window === "undefined") return;
  const resume = () => {
    const context = getContext();
    if (context && context.state !== "running") {
      context.resume().catch(() => {});
    }
  };
  const events = ["pointerdown", "keydown", "touchend"] as const;
  events.forEach((event) =>
    window.addEventListener(event, resume, { passive: true }),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx) resume();
  });
}

installUnlock();

function toAudioTime(context: AudioContext, wallMs: number): number {
  return context.currentTime + (wallMs - Date.now()) / 1000;
}

function load(src: string): Promise<AudioBuffer> {
  const cached = decoded.get(src);
  if (cached) return Promise.resolve(cached);

  const inFlight = pending.get(src);
  if (inFlight) return inFlight;

  const context = getContext();
  if (!context) return Promise.reject(new Error("Web Audio unavailable"));

  const promise = fetch(src)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${src}: ${res.status}`);
      return res.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      decoded.set(src, buffer);
      pending.delete(src);
      return buffer;
    })
    .catch((error) => {
      pending.delete(src);
      throw error;
    });

  pending.set(src, promise);
  return promise;
}

function startSource(
  context: AudioContext,
  buffer: AudioBuffer,
  { volume = 1, rate = 1, bus = "sfx" }: PlayOptions,
  when: number,
  loop = false,
  offset = 0,
) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.playbackRate.value = rate;

  const gain = context.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(buses![bus]);
  source.addEventListener("ended", () => gain.disconnect(), { once: true });
  source.start(Math.max(when, context.currentTime), offset);
  return { source, gain };
}

let noiseBuffer: AudioBuffer | null = null;

function getNoise(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(context.sampleRate * 0.08);
  noiseBuffer = context.createBuffer(1, length, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function playKick(context: AudioContext, gain: GainNode, when: number, volume: number) {
  const oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(150, when);
  oscillator.frequency.exponentialRampToValueAtTime(40, when + 0.12);
  gain.gain.setValueAtTime(0.24 * volume, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
  oscillator.connect(gain);
  oscillator.start(when);
  oscillator.stop(when + 0.2);
  return oscillator;
}

function playHat(context: AudioContext, gain: GainNode, when: number, volume: number) {
  const noise = context.createBufferSource();
  noise.buffer = getNoise(context);
  gain.gain.setValueAtTime(0.12 * volume, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
  noise.connect(gain);
  noise.start(when);
  noise.stop(when + 0.1);
  return noise;
}

function stopNode(
  context: AudioContext,
  source: AudioBufferSourceNode,
  gain: GainNode,
  fadeOut = 0,
) {
  try {
    if (fadeOut > 0) {
      const now = context.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fadeOut);
      source.stop(now + fadeOut);
    } else {
      source.stop();
    }
  } catch {}
}

export const sound = {
  preload(srcs: string | string[]): Promise<void> {
    const list = Array.isArray(srcs) ? srcs : [srcs];
    return Promise.allSettled(list.map(load)).then(() => {});
  },

  play(src: string, options: PlayOptions = {}): SoundHandle {
    const context = getContext();
    if (!context || muted) return NOOP_HANDLE;

    const requestedAt = options.at ?? Date.now();
    let node: ReturnType<typeof startSource> | null = null;
    let stopped = false;

    const begin = (buffer: AudioBuffer) => {
      if (stopped) return;
      node = startSource(
        context,
        buffer,
        options,
        toAudioTime(context, requestedAt),
      );
    };

    const buffer = decoded.get(src);
    if (buffer) {
      begin(buffer);
    } else {
      load(src)
        .then((loaded) => {
          const maxDelay = options.maxDelay ?? MAX_LATE_START_MS;
          if (Date.now() - requestedAt <= maxDelay) begin(loaded);
        })
        .catch(() => {});
    }

    return {
      stop: (fadeOut) => {
        stopped = true;
        if (node) stopNode(context, node.source, node.gain, fadeOut);
      },
    };
  },

  loop(src: string, options: LoopOptions = {}): SoundHandle {
    const context = getContext();
    if (!context) return NOOP_HANDLE;

    const { volume = 1, bus = "music", fadeIn = 0 } = options;
    let node: ReturnType<typeof startSource> | null = null;
    let stopped = false;

    load(src)
      .then((buffer) => {
        if (stopped) return;
        node = startSource(
          context,
          buffer,
          { volume: fadeIn > 0 ? 0 : volume, bus },
          context.currentTime,
          true,
        );
        if (fadeIn > 0) {
          node.gain.gain.linearRampToValueAtTime(
            volume,
            context.currentTime + fadeIn,
          );
        }
      })
      .catch(() => {});

    return {
      stop: (fadeOut) => {
        stopped = true;
        if (node) stopNode(context, node.source, node.gain, fadeOut);
      },
    };
  },

  music(
    src: string,
    {
      at,
      offsetMs = 0,
      barMs,
      rate = 1,
      volume = 1,
      bus = "music",
      onError,
    }: MusicOptions,
  ): SoundHandle {
    const context = getContext();
    if (!context) return NOOP_HANDLE;

    const nodes = new Set<ReturnType<typeof startSource>>();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    load(src)
      .then((buffer) => {
        if (stopped) return;
        const fileMs = buffer.duration * 1000;
        const bars = Math.max(1, Math.round((fileMs - offsetMs) / barMs));
        const passMs = (bars * barMs) / rate;
        const leadMs = offsetMs / rate;

        const schedule = (pass: number) => {
          if (stopped) return;
          const startsAt = at + pass * passMs - leadMs;
          const lateMs = Math.max(0, Date.now() - startsAt);
          const skip = (lateMs * rate) / 1000;
          if (skip < buffer.duration) {
            const node = startSource(
              context,
              buffer,
              { volume, rate, bus },
              toAudioTime(context, startsAt + lateMs),
              false,
              skip,
            );
            nodes.add(node);
            node.source.addEventListener("ended", () => nodes.delete(node), {
              once: true,
            });
          }
          timer = setTimeout(
            () => schedule(pass + 1),
            Math.max(0, startsAt + passMs - Date.now() - MUSIC_LOOKAHEAD_MS),
          );
        };
        schedule(Math.max(0, Math.floor((Date.now() - at + leadMs) / passMs)));
      })
      .catch((error) => {
        if (stopped) return;
        console.warn(`[sound] music ${src} failed`, error);
        onError?.(error);
      });

    return {
      stop: (fadeOut) => {
        stopped = true;
        clearTimeout(timer);
        for (const node of nodes)
          stopNode(context, node.source, node.gain, fadeOut);
      },
    };
  },

  stream(src: string, options: LoopOptions = {}): SoundHandle {
    const context = getContext();
    if (!context) return NOOP_HANDLE;

    const { volume = 1, bus = "music", fadeIn = 0 } = options;
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";

    const gain = context.createGain();
    gain.gain.value = fadeIn > 0 ? 0 : volume;
    const source = context.createMediaElementSource(audio);
    source.connect(gain).connect(buses![bus]);

    let started = false;
    let stopped = false;
    const tryPlay = () => {
      if (started || stopped) return;
      audio
        .play()
        .then(() => {
          started = true;
          unsubscribe();
          if (fadeIn > 0) {
            const now = context.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume, now + fadeIn);
          }
        })
        .catch(() => {});
    };
    const unsubscribe = sound.subscribe(() => {
      if (context.state === "running") tryPlay();
    });
    tryPlay();

    const teardown = () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      source.disconnect();
      gain.disconnect();
    };

    return {
      stop: (fadeOut = 0) => {
        if (stopped) return;
        stopped = true;
        unsubscribe();
        if (!started || fadeOut <= 0) return teardown();
        const now = context.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeOut);
        setTimeout(teardown, fadeOut * 1000);
      },
    };
  },

  metronome({
    beatMs,
    beats,
    firstIndex = 0,
    volume,
  }: {
    beatMs: number;
    beats: number;
    firstIndex?: number;
    volume?: number;
  }): SoundHandle {
    const startAt = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const handles: SoundHandle[] = [];

    for (let beat = 0; beat < beats; beat++) {
      const beatOffsetMs = beat * beatMs;
      const playBeat = () => handles.push(sound.tick(firstIndex + beat, { at: startAt + beatOffsetMs, volume }));
      timers.push(setTimeout(playBeat, Math.max(0, beatOffsetMs - METRONOME_LOOKAHEAD_MS)));
    }

    return {
      stop: () => {
        timers.forEach(clearTimeout);
        handles.forEach((handle) => handle.stop());
      },
    };
  },

  scheduleCountdown({
    endsAt,
    tickFrom,
    tickSrc,
    timeUpSrc,
    tickVolume,
    timeUpVolume,
  }: {
    endsAt: number;
    tickFrom: number;
    tickSrc?: string;
    timeUpSrc?: string;
    tickVolume?: number;
    timeUpVolume?: number;
  }): SoundHandle {
    const now = Date.now();
    const handles: SoundHandle[] = [];

    if (tickSrc) {
      for (let secondsLeft = tickFrom; secondsLeft >= 1; secondsLeft--) {
        const at = endsAt - secondsLeft * 1000;
        if (at >= now - 50) {
          handles.push(sound.play(tickSrc, { at, volume: tickVolume }));
        }
      }
    }
    if (timeUpSrc && endsAt >= now - MAX_LATE_START_MS) {
      handles.push(sound.play(timeUpSrc, { at: endsAt, volume: timeUpVolume }));
    }

    return { stop: () => handles.forEach((handle) => handle.stop()) };
  },

  tick(
    index: number,
    {
      at,
      volume = 1,
      bus = "sfx",
    }: Pick<PlayOptions, "at" | "volume" | "bus"> = {},
  ): SoundHandle {
    const context = getContext();
    if (!context || muted || context.state !== "running") return NOOP_HANDLE;

    const when = Math.max(
      toAudioTime(context, at ?? Date.now()),
      context.currentTime,
    );
    const gain = context.createGain();
    gain.connect(buses![bus]);

    const source = index % 2 === 0 ? playKick(context, gain, when, volume) : playHat(context, gain, when, volume);
    source.addEventListener(
      "ended",
      () => {
        source.disconnect();
        gain.disconnect();
      },
      { once: true },
    );

    return {
      stop: () => {
        try {
          source.stop();
        } catch {}
      },
    };
  },

  setBusVolume(bus: SoundBus, volume: number) {
    busVolume[bus] = volume;
    if (ctx && buses)
      buses[bus].gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
  },

  isMuted: () => muted,

  setMuted(next: boolean) {
    muted = next;
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
    } catch {}
    if (ctx && master)
      master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
    emit();
  },

  isUnlocked: () => ctx?.state === "running",

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
