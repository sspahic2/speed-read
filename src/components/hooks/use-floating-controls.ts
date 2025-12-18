import { useState } from "react";

export type FloatingControlsSide = "left" | "right";

type FloatingControlsState = {
  visible?: boolean;
  side?: FloatingControlsSide;
};

export function useFloatingControls(
  initial: FloatingControlsState = { visible: true, side: "left" },
) {
  const [isVisible, setIsVisible] = useState<boolean>(initial.visible ?? true);
  const [side, setSide] = useState<FloatingControlsSide>(initial.side ?? "left");

  return {
    isVisible,
    setIsVisible,
    side,
    setSide,
  };
}
