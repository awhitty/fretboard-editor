import { useEffect, useRef } from "react";

export function useSpaceIsPressed() {
  const spaceIsPressed = useRef(false);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        spaceIsPressed.current = true;
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        spaceIsPressed.current = false;
      }
    };

    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  });

  return spaceIsPressed;
}
