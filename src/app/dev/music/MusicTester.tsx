"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/** The background track and where it starts. Credit lives in docs/CREDITS.md. */
const TRACK = {
  src: "/assets/music/japanese-lofi-jazz.mp3",
  title: "Japanese Lofi Jazz | Calm Piano Beats | Chill and Smooth",
  artist: "Music-for-Videos",
  startVolume: 40,
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function MusicTester() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(TRACK.startVolume);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [failed, setFailed] = useState(false);

  // The slider drives the real volume of the player.
  useEffect(() => {
    if (audio.current) audio.current.volume = volume / 100;
  }, [volume]);

  const toggle = () => {
    const player = audio.current;
    if (!player) return;
    if (player.paused) void player.play().catch(() => setFailed(true));
    else player.pause();
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">Music test</h1>
        <p className="text-sm text-muted-foreground">
          Background music candidate. It loops until you pause it.
        </p>
      </header>

      <audio
        ref={audio}
        src={TRACK.src}
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setLength(event.currentTarget.duration)}
        onError={() => setFailed(true)}
      />

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{TRACK.title}</span>
          <span className="text-sm text-muted-foreground">{TRACK.artist}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button size="lg" onClick={toggle} aria-pressed={playing}>
            {playing ? "Pause" : "Play"}
          </Button>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {formatTime(time)} / {formatTime(length)}
          </span>
        </div>

        <label className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between">
            <span className="font-medium">Volume</span>
            <span className="font-mono text-sm text-muted-foreground tabular-nums">
              {volume}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="h-8 w-full accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            On iPhone the slider does nothing: use the phone&apos;s volume buttons.
          </span>
        </label>

        {failed && (
          <p className="text-sm text-destructive">
            The music file did not load or play. Reload the page and try again.
          </p>
        )}
      </div>
    </section>
  );
}
