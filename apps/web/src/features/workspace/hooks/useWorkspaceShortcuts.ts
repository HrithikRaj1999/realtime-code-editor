import { useEffect } from "react";

interface UseWorkspaceShortcutsOptions {
  onFormat: () => void;
  onToggleNotes: () => void;
  onEditorZoomIn: () => void;
  onEditorZoomOut: () => void;
}

export function useWorkspaceShortcuts({
  onFormat,
  onToggleNotes,
  onEditorZoomIn,
  onEditorZoomOut,
}: UseWorkspaceShortcutsOptions) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.altKey && (event.key === "F" || event.key === "f")) {
        event.preventDefault();
        onFormat();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "j") {
        event.preventDefault();
        onToggleNotes();
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        onEditorZoomIn();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        onEditorZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onEditorZoomIn, onEditorZoomOut, onFormat, onToggleNotes]);
}
