"use client";

const LOADING_VIDEO_PLAYBACK_RATE = 0.8;

type Props = {
  videoSrc?: string;
};

const Loading = ({ videoSrc = "/loading/loading_cat.webm" }: Props) => {
  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black">
      <div className="animate-tv-flicker pointer-events-none absolute inset-0 flex h-full w-full items-center justify-center">
        <div className="animate-scan-drift pointer-events-none absolute inset-0 w-full bg-[repeating-linear-gradient(to_bottom,#141414_0px,#141414_8px,#1A1A1A_8px,#1A1A1A_16px)]" />
        <div className="animate-static-noise pointer-events-none absolute inset-0 h-full w-full bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-size-[3px_3px] opacity-[0.08] mix-blend-overlay" />
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.65)_100%)]" />
        <video
          className="relative w-40 object-contain sm:w-56"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = LOADING_VIDEO_PLAYBACK_RATE;
          }}
        />
      </div>
    </div>
  );
};

export default Loading;
