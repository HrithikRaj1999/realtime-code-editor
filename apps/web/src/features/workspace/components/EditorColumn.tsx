import { Code2, GripHorizontal, StickyNote } from "lucide-react";
import { memo } from "react";
import type { MouseEvent } from "react";
import { CodeEditor, type FormatResult } from "../../../components/CodeEditorV2";
import { NotesPanel } from "../../../components/NotesPanel";
import { PanelHeader } from "./PanelHeader";
import { ZoomControls } from "./ZoomControls";

interface EditorColumnProps {
  roomId: string;
  language: string;
  code: string;
  theme: string;
  fontSize: number;
  formatSignal: number;
  showNotes: boolean;
  notesHeight: number;
  onCodeChange: (code: string) => void;
  onFormatComplete: (result: FormatResult) => void;
  onToggleNotes: () => void;
  onDragStart: (event: MouseEvent) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const EditorColumn = memo(function EditorColumn({
  roomId,
  language,
  code,
  theme,
  fontSize,
  formatSignal,
  showNotes,
  notesHeight,
  onCodeChange,
  onFormatComplete,
  onToggleNotes,
  onDragStart,
  onZoomIn,
  onZoomOut,
}: EditorColumnProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PanelHeader
        icon={<Code2 className="w-3.5 h-3.5 text-blue-400" />}
        label="Editor"
        right={
          <>
            <ZoomControls size={fontSize} onIn={onZoomIn} onOut={onZoomOut} />
            <div className="w-px h-4 bg-[var(--border)]" />
            <button
              onClick={onToggleNotes}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                showNotes
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-[var(--bg-input)] text-[var(--text-faint)] border-[var(--border)] hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5"
              }`}
              title="Toggle Notes (Ctrl+J)"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeEditor
          code={code}
          setCode={onCodeChange}
          language={language}
          fontSize={fontSize}
          theme={theme}
          formatSignal={formatSignal}
          onFormatComplete={onFormatComplete}
        />
      </div>

      <div
        className="flex-none overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: showNotes ? notesHeight : 0 }}
      >
        <div
          onMouseDown={onDragStart}
          className="h-[6px] w-full flex items-center justify-center cursor-row-resize select-none group bg-[var(--border)] hover:bg-[var(--accent)] transition-colors"
          title="Drag to resize notes"
        >
          <GripHorizontal className="w-5 h-3 text-[var(--text-faint)] group-hover:text-[var(--accent)] opacity-60 group-hover:opacity-100 transition-all" />
        </div>

        <div className="overflow-hidden" style={{ height: notesHeight - 6 }}>
          <NotesPanel roomId={roomId} />
        </div>
      </div>
    </div>
  );
});
