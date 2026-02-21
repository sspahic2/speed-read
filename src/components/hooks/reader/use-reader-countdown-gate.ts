"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UseReaderCountdownGateParams = {
  seconds?: number;
  onCountdownComplete: () => void;
};

type UseReaderCountdownGateReturn = {
  countdownValue: number | null;
  isCountdownActive: boolean;
  startCountdown: () => void;
  cancelCountdown: () => void;
};

export function useReaderCountdownGate({
  seconds = 3,
  onCountdownComplete,
}: UseReaderCountdownGateParams): UseReaderCountdownGateReturn {
  const normalizedSeconds = useMemo(() => Math.max(1, Math.round(seconds)), [seconds]);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const isCountdownActive = countdownValue !== null;

  useEffect(() => {
    if (countdownValue === null) return;

    const timer = window.setTimeout(() => {
      if (countdownValue <= 1) {
        setCountdownValue(null);
        onCountdownComplete();
        return;
      }

      setCountdownValue((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdownValue, onCountdownComplete]);

  const startCountdown = useCallback(() => {
    setCountdownValue(normalizedSeconds);
  }, [normalizedSeconds]);

  const cancelCountdown = useCallback(() => {
    setCountdownValue(null);
  }, []);

  return {
    countdownValue,
    isCountdownActive,
    startCountdown,
    cancelCountdown,
  };
}
