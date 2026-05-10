"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EncryptedText,
  ENCRYPTED_TEXT_DEFAULT_REVEAL_MS,
} from "@/components/aceternity/encrypted-text";

const SPLASH_COPY = "Market Meerkat";

const POST_REVEAL_MS = 1000;
const FADE_MS = 600;

type IntroSplashProps = {
  /** Fires after the overlay has faded out and unmounted. */
  onComplete?: () => void;
};

export function IntroSplash({ onComplete }: IntroSplashProps) {
  const [hidden, setHidden] = useState(false);
  const [fading, setFading] = useState(false);

  const doneRef = useRef(false);
  const fadeStartedRef = useRef(false);
  const fallbackRevealTimerRef = useRef<number | null>(null);
  const fallbackUnmountTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finishAndUnmount = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (fallbackUnmountTimerRef.current !== null) {
      clearTimeout(fallbackUnmountTimerRef.current);
      fallbackUnmountTimerRef.current = null;
    }
    setHidden(true);
    onCompleteRef.current?.();
  }, []);

  const startFadeOut = useCallback(() => {
    if (fadeStartedRef.current) return;
    fadeStartedRef.current = true;
    if (fallbackRevealTimerRef.current !== null) {
      clearTimeout(fallbackRevealTimerRef.current);
      fallbackRevealTimerRef.current = null;
    }
    setFading(true);

    fallbackUnmountTimerRef.current = window.setTimeout(
      () => finishAndUnmount(),
      FADE_MS + 100,
    );
  }, [finishAndUnmount]);

  const scheduleFadeAfterReveal = useCallback(() => {
    window.setTimeout(startFadeOut, POST_REVEAL_MS);
  }, [startFadeOut]);

  useEffect(() => {
    const dwellBudget =
      SPLASH_COPY.length * ENCRYPTED_TEXT_DEFAULT_REVEAL_MS +
      POST_REVEAL_MS +
      FADE_MS +
      2500;

    fallbackRevealTimerRef.current = window.setTimeout(
      () => startFadeOut(),
      dwellBudget,
    );

    return () => {
      if (fallbackRevealTimerRef.current !== null) {
        clearTimeout(fallbackRevealTimerRef.current);
      }
      if (fallbackUnmountTimerRef.current !== null) {
        clearTimeout(fallbackUnmountTimerRef.current);
      }
    };
  }, [startFadeOut]);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      onTransitionEnd={e => {
        if (!fadeStartedRef.current) return;
        if (e.target !== e.currentTarget) return;
        if (e.propertyName !== "opacity") return;
        finishAndUnmount();
      }}
    >
      <EncryptedText
        text={SPLASH_COPY}
        onRevealComplete={scheduleFadeAfterReveal}
        className="inline-block whitespace-nowrap text-center font-mono text-[36px] font-bold uppercase tracking-[3px] text-[#00e5ff] opacity-95 [text-shadow:none]"
      />
    </div>
  );
}
