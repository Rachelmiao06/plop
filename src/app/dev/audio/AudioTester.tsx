"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AMBIENCE,
  isAudioUnlocked,
  playFullClear,
  playNearMiss,
  playRoundStart,
  playStarHit,
  playTap,
  playThump,
  playTie,
  playWin,
  playWhoosh,
  setAmbienceVolume,
  setCrunch,
  startAmbience,
  stopAmbience,
  stopCrunch,
  unlockAudio,
  unlockAudioOnFirstTouch,
  whenRecordingsLoaded,
} from "@/lib/audio";

/** The named one-shots, in the order a match meets them. */
const CUES = [
  { label: "Round start", hint: "a soft chime", play: playRoundStart },
  { label: "Star pin hit", hint: "a little sparkle", play: playStarHit },
  { label: "Near miss", hint: "a tiny kitten mew", play: playNearMiss },
  { label: "Full clear", hint: "a warm bell flourish", play: playFullClear },
  { label: "Win", hint: "a happy jingle", play: playWin },
  { label: "Tie", hint: "a gentle ding-dong", play: playTie },
  { label: "Button tap", hint: "a soft paper tap", play: playTap },
] as const;

/** Timings of the "whole throw" demo, in milliseconds. */
const DEMO = { roll: 1800, flight: 520 };

function Slider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-sm text-muted-foreground tabular-nums">
          {value}
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 w-full accent-primary"
      />
      <span className="text-sm text-muted-foreground">{hint}</span>
    </label>
  );
}

export function AudioTester() {
  const [speed, setSpeed] = useState(50);
  const [size, setSize] = useState(30);
  const [power, setPower] = useState(70);
  const [rolling, setRolling] = useState(false);
  const [ambience, setAmbience] = useState(false);
  const [ambienceVolume, setAmbienceLevel] = useState(Math.round(AMBIENCE.volume * 100));
  const [soundOn, setSoundOn] = useState(false);
  const [source, setSource] = useState<"loading" | "recorded" | "synth">("loading");
  const demo = useRef<{ ramp: number; timers: number[] }>({ ramp: 0, timers: [] });

  // Sound switches on with the first touch anywhere on the page.
  useEffect(
    () =>
      unlockAudioOnFirstTouch(() => {
        setSoundOn(true);
        void whenRecordingsLoaded().then((ok) => setSource(ok ? "recorded" : "synth"));
      }),
    [],
  );

  // While rolling, the crunch follows the sliders live.
  useEffect(() => {
    if (rolling) setCrunch(speed / 100, size / 100);
    else stopCrunch();
  }, [rolling, speed, size]);

  const cancelDemo = () => {
    clearInterval(demo.current.ramp);
    demo.current.timers.forEach(clearTimeout);
    demo.current.timers = [];
  };

  useEffect(() => {
    const running = demo.current;
    return () => {
      clearInterval(running.ramp);
      running.timers.forEach(clearTimeout);
      stopCrunch();
      stopAmbience();
    };
  }, []);

  /** Every button is also a valid "first touch". */
  const wake = () => {
    unlockAudio();
    setSoundOn(isAudioUnlocked());
  };

  const toggleRoll = () => {
    wake();
    cancelDemo();
    setRolling((on) => !on);
  };

  const whoosh = () => {
    wake();
    playWhoosh(power / 100);
  };

  const thump = () => {
    wake();
    playThump(size / 100);
  };

  const toggleAmbience = () => {
    wake();
    if (ambience) stopAmbience();
    else startAmbience();
    setAmbience(!ambience);
  };

  const changeAmbienceVolume = (value: number) => {
    setAmbienceLevel(value);
    setAmbienceVolume(value / 100);
  };

  /** Roll while the ball grows to the chosen size, launch, then land. */
  const wholeThrow = () => {
    wake();
    cancelDemo();
    setRolling(false);
    const started = performance.now();
    const grow = () =>
      setCrunch(
        speed / 100,
        (size / 100) * Math.min(1, (performance.now() - started) / DEMO.roll),
      );
    grow();
    demo.current.ramp = window.setInterval(grow, 40);
    demo.current.timers.push(
      window.setTimeout(() => {
        clearInterval(demo.current.ramp);
        stopCrunch();
        playWhoosh(power / 100);
      }, DEMO.roll),
      window.setTimeout(() => playThump(size / 100), DEMO.roll + DEMO.flight),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Sound test</h1>
        <p className="text-sm text-muted-foreground">
          {soundOn
            ? "Sound is on. On an iPhone, make sure the silent switch is off."
            : "Sound is off until your first tap."}
        </p>
        {soundOn && (
          <p className="text-sm text-muted-foreground">
            {source === "recorded" && "Playing real snow recordings."}
            {source === "synth" &&
              "Recordings did not load, so you are hearing the synthesized stand-in."}
            {source === "loading" && "Loading recordings…"}
          </p>
        )}
      </header>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground">
        <h2 className="text-lg font-semibold">Snow crunch</h2>
        <Slider
          label="Speed"
          hint="Faster packs the grains closer together."
          value={speed}
          onChange={setSpeed}
        />
        <Slider
          label="Ball size"
          hint="A bigger ball sounds deeper. Also sets the thump."
          value={size}
          onChange={setSize}
        />
        <Button
          size="lg"
          variant={rolling ? "secondary" : "default"}
          className="h-12 text-base"
          onClick={toggleRoll}
        >
          {rolling ? "Stop rolling" : "Start rolling"}
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground">
        <h2 className="text-lg font-semibold">Launch whoosh</h2>
        <Slider
          label="Power"
          hint="More power is longer, brighter and louder."
          value={power}
          onChange={setPower}
        />
        <Button size="lg" className="h-12 text-base" onClick={whoosh}>
          Whoosh
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground">
        <h2 className="text-lg font-semibold">Impact thump</h2>
        <p className="text-sm text-muted-foreground">
          Uses the ball size slider above.
        </p>
        <Button size="lg" className="h-12 text-base" onClick={thump}>
          Thump
        </Button>
      </section>

      <Button
        size="lg"
        variant="outline"
        className="h-12 text-base"
        onClick={wholeThrow}
      >
        Play a whole throw
      </Button>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground">
        <h2 className="text-lg font-semibold">Village ambience</h2>
        <p className="text-sm text-muted-foreground">
          Soft wind with gusts and the cocoa-corner fire. Now and then distant wind chimes or
          sleigh bells, and a chickadee. Give it a minute to hear them all.
        </p>
        <Slider
          label="Ambience volume"
          hint="Separate from the music and the effects."
          value={ambienceVolume}
          onChange={changeAmbienceVolume}
        />
        <Button
          size="lg"
          variant={ambience ? "secondary" : "default"}
          className="h-12 text-base"
          onClick={toggleAmbience}
        >
          {ambience ? "Stop ambience" : "Start ambience"}
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground">
        <h2 className="text-lg font-semibold">Game moments</h2>
        <p className="text-sm text-muted-foreground">
          Named sounds for the match to call later.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CUES.map((cue) => (
            <Button
              key={cue.label}
              size="lg"
              variant="outline"
              className="flex h-auto flex-col items-start gap-0.5 py-3 text-left"
              onClick={() => {
                wake();
                cue.play();
              }}
            >
              <span className="text-base">{cue.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{cue.hint}</span>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
