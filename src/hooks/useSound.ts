import { useCallback, useEffect, useRef } from "react";
import type { Stone } from "@/game/types";

interface Tone {
  frequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  delay?: number;
}

function playTones(context: AudioContext, tones: Tone[]): void {
  const start = context.currentTime;

  for (const tone of tones) {
    const at = start + (tone.delay ?? 0);
    const oscillator = context.createOscillator();
    const amplifier = context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, at);
    amplifier.gain.setValueAtTime(0.0001, at);
    amplifier.gain.exponentialRampToValueAtTime(tone.gain, at + 0.008);
    amplifier.gain.exponentialRampToValueAtTime(0.0001, at + tone.duration);
    oscillator.connect(amplifier);
    amplifier.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + tone.duration + 0.02);
  }
}

export function useSound(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!contextRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
    }
    if (contextRef.current.state === "suspended") {
      void contextRef.current.resume();
    }
    return contextRef.current;
  }, []);

  const playStone = useCallback(
    (player: Stone) => {
      if (!enabled) return;
      const context = ensureContext();
      if (!context) return;

      const base = player === 1 ? 196 : 246.94;
      playTones(context, [
        { frequency: base, duration: 0.07, gain: 0.055, type: "sine" },
        { frequency: base * 2.02, duration: 0.025, gain: 0.018, type: "triangle" },
      ]);
    },
    [enabled, ensureContext],
  );

  const playWin = useCallback(() => {
    if (!enabled) return;
    const context = ensureContext();
    if (!context) return;

    playTones(context, [
      { frequency: 392, duration: 0.34, gain: 0.038, type: "sine", delay: 0.05 },
      { frequency: 523.25, duration: 0.38, gain: 0.032, type: "sine", delay: 0.16 },
      { frequency: 659.25, duration: 0.55, gain: 0.026, type: "sine", delay: 0.29 },
    ]);
  }, [enabled, ensureContext]);

  useEffect(() => {
    return () => {
      if (contextRef.current) {
        void contextRef.current.close().catch(() => undefined);
        contextRef.current = null;
      }
    };
  }, []);

  return { playStone, playWin };
}
