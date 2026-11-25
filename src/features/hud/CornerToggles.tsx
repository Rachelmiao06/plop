"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  getAudioSettings,
  getServerAudioSettings,
  setEffectsOn,
  startMusicOnFirstTouch,
  subscribeAudioSettings,
  toggleMusic,
} from "@/lib/audio";
import { content } from "./content";
import { EyeIcon, MusicIcon, PencilFrame, SpeakerIcon } from "./Doodles";
import { styles } from "./hudStyles";

function RoundToggle({
  label,
  pressed,
  onClick,
  seed,
  audio,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  seed: number;
  audio?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      data-audio-toggle={audio ? "" : undefined}
      onClick={onClick}
      className={`relative size-10 rounded-full p-0 text-ink hover:bg-transparent ${styles.glass} ${styles.toggle}`}
    >
      <PencilFrame seed={seed} radius={20} overshoot={5} />
      {children}
    </Button>
  );
}

/**
 * The hide-score eye plus the music and sound-effect switches in the top-left corner: one row on a phone
 * (level with the scene's top-right buttons, so the score panel gets the full width below), a column on
 * wider screens (#46).
 */
export function CornerToggles({
  hidden,
  onHiddenChange,
  showAudio = true,
}: {
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
  showAudio?: boolean;
}) {
  const audio = useSyncExternalStore(subscribeAudioSettings, getAudioSettings, getServerAudioSettings);

  // Music fades in after the first touch anywhere (if its switch is on).
  useEffect(() => (showAudio ? startMusicOnFirstTouch() : undefined), [showAudio]);

  const musicLabel = !audio.music
    ? content.text.musicOff
    : audio.musicPlaying
      ? content.text.musicOn
      : content.text.musicWaiting;

  return (
    <div className="pointer-events-auto flex flex-row gap-2 md:flex-col">
      <RoundToggle
        label={hidden ? content.text.show : content.text.hide}
        pressed={hidden}
        onClick={() => onHiddenChange(!hidden)}
        seed={31}
      >
        <EyeIcon open={!hidden} />
      </RoundToggle>
      {showAudio && (
        <>
          <RoundToggle label={musicLabel} pressed={audio.music} onClick={toggleMusic} seed={41} audio>
            <MusicIcon on={audio.music} />
          </RoundToggle>
          <RoundToggle
            label={audio.effects ? content.text.effectsOn : content.text.effectsOff}
            pressed={audio.effects}
            onClick={() => setEffectsOn(!audio.effects)}
            seed={53}
            audio
          >
            <SpeakerIcon on={audio.effects} />
          </RoundToggle>
        </>
      )}
    </div>
  );
}
