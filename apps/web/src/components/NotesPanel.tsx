import { useState, useEffect, useRef, useCallback } from "react";
import { StickyNote, Trash2 } from "lucide-react";

interface NotesPanelProps {
  roomId: string;
}

export function NotesPanel({ roomId }: NotesPanelProps) {
  const storageKey = `cs-notes-${roomId}`;
  const [notes, setNotes] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) || "";
    }
    return "";
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(storageKey, notes);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [notes, storageKey]);

  const handleClear = useCallback(() => {
    setNotes("");
    localStorage.removeItem(storageKey);
    textareaRef.current?.focus();
  }, [storageKey]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)] theme-transition">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-[var(--border)] shrink-0">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          Notes
          {notes.length > 0 && (
            <span className="text-[var(--text-faint)] font-normal normal-case tracking-normal text-[10px] ml-1">
              {notes.length} chars
            </span>
          )}
        </span>
        {notes.length > 0 && (
          <button
            onClick={handleClear}
            className="p-1 rounded text-[var(--text-faint)] hover:text-red-400 hover:bg-red-500/8 transition-colors"
            title="Clear notes"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Textarea */}
      <div className="flex-1 min-h-0">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down your approach, pseudo-code, or thoughts…"
          className="w-full h-full resize-none bg-transparent px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none font-mono leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
