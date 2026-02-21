import { Loader2, SquareTerminal, ChevronRight, Trash2 } from "lucide-react";

interface OutputPanelProps {
  output: string;
  loading?: boolean;
  onClear?: () => void;
  fontSize?: number;
}

export function OutputPanel({ output, loading = false, onClear, fontSize = 13 }: OutputPanelProps) {
  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)] theme-transition">
      {/* Output body */}
      <div className="flex-1 p-4 overflow-y-auto font-mono" style={{ fontSize: `${fontSize}px` }}>
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--accent)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[13px] font-medium animate-pulse">Executing code…</span>
          </div>
        ) : output ? (
          <div className="space-y-0.5">
            {output.split("\n").map((line, i) => (
              <div
                key={i}
                className="flex gap-2 group hover:bg-[var(--bg-hover)] rounded px-1 -mx-1 transition-colors"
              >
                <ChevronRight
                  className="w-3 h-3 mt-1.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: "var(--output-chevron)" }}
                />
                <pre
                  className="whitespace-pre-wrap leading-relaxed flex-1"
                  style={{ color: "var(--output-text)", fontSize: `${fontSize}px` }}
                >
                  {line}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-faint)]">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center">
              <SquareTerminal className="w-6 h-6 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">No output yet</p>
              <p className="text-[11px] mt-1 text-[var(--text-faint)]">
                Hit <span className="text-emerald-500 font-semibold">▶ Run Code</span> to execute
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Clear bar */}
      {output && onClear && (
        <div className="flex items-center justify-end px-3 py-1.5 border-t border-[var(--border)]">
          <button
            onClick={onClear}
            className="text-[11px] text-[var(--text-faint)] hover:text-red-400 px-2 py-1 rounded-md hover:bg-red-500/8 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
