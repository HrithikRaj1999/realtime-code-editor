import { useCallback, useRef, useState } from "react";

interface UseNotesResizeOptions {
  initialHeight: number;
  minHeight: number;
  maxHeight: number;
}

export function useNotesResize({ initialHeight, minHeight, maxHeight }: UseNotesResizeOptions) {
  const [notesHeight, setNotesHeight] = useState(initialHeight);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(initialHeight);

  const onDragStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      dragging.current = true;
      startY.current = event.clientY;
      startHeight.current = notesHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragging.current) {
          return;
        }
        const delta = startY.current - moveEvent.clientY;
        const nextHeight = Math.min(maxHeight, Math.max(minHeight, startHeight.current + delta));
        setNotesHeight(nextHeight);
      };

      const onMouseUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [maxHeight, minHeight, notesHeight],
  );

  return { notesHeight, onDragStart };
}
