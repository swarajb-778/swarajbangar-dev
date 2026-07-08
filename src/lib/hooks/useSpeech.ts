'use client';

// ═══════════════════════════════════════════════════════════════
// useSpeech — speak assistant answers aloud.
//
// Primary path: backend TTS via the same-origin /api/tts proxy (OpenAI
// voice). Fallback when the backend is down: the browser's built-in
// speechSynthesis — the speak button always works (demo-mode contract).
// One utterance at a time; starting a new one stops the previous.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyDemoMode } from '@/lib/api-client';

export interface UseSpeech {
  /** id of the message currently being spoken, or null. */
  readonly speakingId: string | null;
  readonly speak: (id: string, text: string) => Promise<void>;
  readonly stop: () => void;
}

export function useSpeech(): UseSpeech {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  // Monotonic token so a stale fetch can't hijack a newer utterance.
  const playSeq = useRef(0);

  const stop = useCallback(() => {
    playSeq.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }, []);

  // Halt any audio if the component unmounts mid-playback.
  useEffect(() => stop, [stop]);

  const speak = useCallback(
    async (id: string, text: string) => {
      stop();
      if (!text) return;
      const seq = playSeq.current;
      setSpeakingId(id);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.slice(0, 1500) }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        if (seq !== playSeq.current) return; // superseded while fetching
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        const done = () => {
          if (seq === playSeq.current) stop();
        };
        audio.onended = done;
        audio.onerror = done;
        await audio.play();
      } catch {
        if (seq !== playSeq.current) return;
        notifyDemoMode('TTS backend unavailable');
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          setSpeakingId(null);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
          if (seq === playSeq.current) setSpeakingId(null);
        };
        utterance.onerror = () => {
          if (seq === playSeq.current) setSpeakingId(null);
        };
        window.speechSynthesis.speak(utterance);
      }
    },
    [stop]
  );

  return { speakingId, speak, stop };
}
